# AGENTS.md

## Tech Stack
- React 19 + TypeScript + Vite 7
- Firebase Firestore (real-time `onSnapshot`) + Google Auth
- Tailwind CSS + shadcn/ui (New York style)
- Deploy: Vercel (SPA)
- PWA: vite-plugin-pwa

## Firestore Collections
Semua data di bawah `artifacts/default-app-id/public/data/`:
- `schedules` - Jadwal pelajaran (day, jp, mapel, guru, classes[])
- `guru` - Data guru (name, role: guru/staff, tasks[])
- `kelas` - Data kelas (name)
- `mapel` - Mata pelajaran (name, guru)
- `tugas` - Tugas tambahan (name, jp)
- `timeSlots` - Slot waktu (type, jp, startTime, endTime, order, dayType)
- `infoLinks` - Portal informasi (title, url)
- `admins` - UID admin (doc ID = Firebase Auth UID)
- `config/signatures` - Pengaturan tanda tangan
- `config/jpCalculation` - Metode hitung JP (byClass/bySession)
- `config/piketApi` - URL API piket

## Critical Patterns (JANGAN DIRUSAK)

### 1. Real-time Firebase Subscription
Semua hook di `useFirebase.ts` menggunakan `onSnapshot` untuk real-time sync.
CRUD functions langsung `addDoc`/`updateDoc`/`deleteDoc`, lalu listener otomatis update state.
Jangan ubah mekanisme subscription tanpa memahami dampak ke semua consumer.

### 2. Print Dual-View Pattern
Komponen cetak render dua versi (screen + print) yang di-toggle via CSS `hidden print:block`.
Versi print menggunakan `PrintLayout` wrapper dengan kop surat, tanda tangan, QR code.
Saat mengubah UI komponen, pastikan versi print juga di-update.

### 3. `calculateTeacherJP()` - scheduleUtils.ts
Fungsi inti perhitungan JP guru. Dipakai di `TeacherStats` dan `ScheduleView`.
Dua metode: `byClass` (1 sesi + 3 kelas = 3 JP) vs `bySession` (1 sesi = 1 JP).
Jangan ubah logic tanpa testing ke kedua consumer.

### 4. `getDbPath()` - firebase.ts
Semua Firestore path melewati fungsi ini. Jangan hardcode path langsung di komponen.

### 5. Auth Flow
Google Sign-In → cek `admins/{uid}` di Firestore → jika tidak ada, sign out.
Admin status di-cache per session (bukan real-time). Jangan ubah flow ini.

### 6. Admin Route Guard
`AdminRoute` wrapper di `App.tsx` memblok akses non-admin.
Route baru admin WAJIB dibungkus `<AdminRoute>`.

### 7. Default Time Slots
Jika koleksi `timeSlots` kosong, hook gunakan default dari `types/index.ts`.
Default slots tidak bisa di-edit/delete, hanya bisa di-seed ke DB.

### 8. Import Pipeline - ScheduleEditor
Validasi JSON import: parse → validate → conflict check (external + internal) → preview → import.
Hanya row dengan status `valid` atau `conflict` yang di-import.

## Route Structure
| Route | Component | Protection |
|-------|-----------|------------|
| `/` | ScheduleView | Public |
| `/login` | ScheduleView (auto-open login) | Public |
| `/teachers` | TeacherStats | Admin |
| `/conflicts` | ConflictChecker | Admin |
| `/manage` | ScheduleEditor | Admin |
| `/data` | DataManager | Admin |
| `/timeslots` | TimeSlotManager | Admin |
| `/settings` | Settings | Admin |

## Rules for New Features
- Route admin baru: tambah di `App.tsx`, bungkus `<AdminRoute>`
- Koleksi Firestore baru: buat hook di `useFirebase.ts` dengan pattern `onSnapshot` + CRUD
- Komponen dengan print: ikuti pattern dual-view (screen + `hidden print:block`)
- Perubahan types: update semua komponen yang menggunakan type tersebut
- Data mutations: selalu handle loading state agar tombol bisa di-disable

## Push Rules (Security)
Sebelum push ke remote repository, WAJIB periksa:
1. Tidak ada secrets, API keys, atau tokens dalam diff
2. Tidak ada credentials atau passwords
3. Tidak ada hardcoded environment variables atau isi `.env`
4. Tidak ada sensitive data (personal data, internal URLs)
5. Review config/infra changes dengan teliti
6. Verify new packages legitimate
7. Run `npm run build` - pastikan tidak ada error
Hanya push jika SEMUA check pass.
