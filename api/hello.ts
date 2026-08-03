export default function handler(
    req: any,
    res: { status: (code: number) => any }
) {
    res.status(200).json({
        ok: true,
        node: process.version,
        cwd: process.cwd(),
        hasGlobalFetch: typeof globalThis.fetch === 'function',
        hasGlobalResponse: typeof globalThis.Response === 'function',
    });
}
