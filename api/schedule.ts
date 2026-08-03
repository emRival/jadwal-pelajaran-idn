import type { IncomingMessage, ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { Schedule, TimeSlot } from '../src/types';
import { DEFAULT_TIME_SLOTS, DAYS_OF_WEEK_API } from '../src/types';

// Public Firestore web API key (already exposed in the SPA bundle) + project config.
// The schedule data is public, so no secret/service-account is needed here.
const FIREBASE_API_KEY = 'AIzaSyCtMvL8jM87kvtmZafYhSju39xMFm9M_ZM';
const PROJECT_ID = 'jadwal-pelajaran-idn';
const DATA_PREFIX = 'artifacts/default-app-id/public/data';

// CDN caching caps Firestore reads to ~1/min even under spam, protecting quota.
// The per-IP hard limit (e.g. 10 req/min) is enforced by a Vercel WAF rate-limit rule.
const RESPONSE_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    'Content-Type': 'application/json',
};

function httpsGet(url: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = httpsRequest(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
    });
}

function send(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, RESPONSE_HEADERS);
    res.end(JSON.stringify(body));
}

function parseValue(value: any): any {
    if (value === null || typeof value !== 'object') return value;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('booleanValue' in value) return value.booleanValue;
    if ('stringValue' in value) return value.stringValue;
    if ('timestampValue' in value) return value.timestampValue;
    if ('referenceValue' in value) return value.referenceValue;
    if ('arrayValue' in value) return (value.arrayValue?.values || []).map(parseValue);
    if ('mapValue' in value) return parseFields(value.mapValue?.fields || {});
    return null;
}

function parseFields(fields: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
        out[key] = parseValue(value);
    }
    return out;
}

async function fetchCollection(collectionName: string): Promise<any[]> {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${DATA_PREFIX}/${collectionName}?key=${FIREBASE_API_KEY}&pageSize=1000`;
    const { status, body } = await httpsGet(url);
    if (status !== 200) {
        throw new Error(`Firestore read failed for "${collectionName}" (HTTP ${status})`);
    }
    const json = JSON.parse(body);
    return (json.documents || []).map((doc: any) => {
        const segments = String(doc.name).split('/');
        return { id: segments[segments.length - 1], ...parseFields(doc.fields || {}) };
    });
}

function buildTimeSlotList(slots: any[]): any[] {
    return slots
        .slice()
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
        .map((slot) => ({
            order: Number(slot.order ?? 0),
            type: slot.type === 'break' ? 'break' : 'lesson',
            jp: slot.jp != null ? Number(slot.jp) : undefined,
            startTime: slot.startTime || '',
            endTime: slot.endTime || '',
            name: slot.name || undefined,
        }));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, RESPONSE_HEADERS);
        res.end();
        return;
    }
    if (req.method !== 'GET') {
        send(res, 405, { status: 'error', message: 'Method not allowed. Use GET.' });
        return;
    }

    try {
        const [scheduleDocs, timeSlotDocs] = await Promise.all([
            fetchCollection('schedules'),
            fetchCollection('timeSlots'),
        ]);

        const schedules = scheduleDocs as Schedule[];
        const timeSlots = timeSlotDocs as TimeSlot[];

        // Weekday slots: everything that is not explicitly marked as saturday.
        let weekdaySlots = timeSlots
            .filter((slot) => slot.dayType !== 'saturday')
            .sort((a, b) => a.order - b.order);
        if (weekdaySlots.length === 0) {
            weekdaySlots = DEFAULT_TIME_SLOTS.map((slot, i) => ({
                ...slot,
                order: slot.order ?? i + 1,
                id: `default-${i}`,
            })) as TimeSlot[];
        }

        // Saturday slots: only dayType === 'saturday'. Fall back to weekday slots.
        let saturdaySlots = timeSlots
            .filter((slot) => slot.dayType === 'saturday')
            .sort((a, b) => a.order - b.order);
        if (saturdaySlots.length === 0) {
            saturdaySlots = weekdaySlots;
        }

        const days = [1, 2, 3, 4, 5, 6].map((dayNum) => {
            const items = schedules
                .filter((s) => Number(s.day) === dayNum)
                .sort((a, b) => Number(a.jp) - Number(b.jp))
                .map((s) => ({
                    jp: Number(s.jp),
                    mapel: s.mapel || '',
                    guru: s.guru || '',
                    classes: Array.isArray(s.classes) ? s.classes : [],
                }));
            return {
                day: dayNum,
                name: DAYS_OF_WEEK_API[dayNum] || '',
                dayType: dayNum === 6 ? 'saturday' : 'weekday',
                items,
            };
        });

        send(res, 200, {
            status: 'success',
            generatedAt: new Date().toISOString(),
            data: {
                timeSlots: {
                    weekday: buildTimeSlotList(weekdaySlots),
                    saturday: buildTimeSlotList(saturdaySlots),
                },
                days,
            },
        });
    } catch (err) {
        console.error('api/schedule error:', err);
        send(res, 500, { status: 'error', message: 'Gagal membaca data jadwal. Coba lagi nanti.' });
    }
}
