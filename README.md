# Jadwal Pelajaran - IDN Boarding School Bogor

Aplikasi manajemen jadwal pelajaran modern, responsif, dan real-time untuk SMP & SMK IDN Boarding School Bogor. Dibangun menggunakan React, Vite, Tailwind CSS, dan Firebase.

## 🚀 Fitur Utama
- **Jadwal Real-time**: Perubahan jadwal langsung muncul tanpa refresh.
- **Support SMP & SMK**: Kustomisasi tampilan dan logika untuk kedua jenjang.
- **Print Layout**: Mode cetak jadwal yang rapi dengan tanda tangan digital.
- **PWA Ready**: Bisa diinstal di HP/Desktop dan bekerja offline (aset di-cache).
- **Admin Panel**: Kelola guru, kelas, mapel, dan jadwal dengan mudah.
- **Deteksi Konflik**: Otomatis mendeteksi jika guru mengajar di 2 kelas di jam yang sama.

## 🛠 Teknologi
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Backend/DB**: Firebase Firestore
- **Deployment**: Vercel

## ⚙️ Cara Install & Menjalankan

### 1. Clone Repositori
```bash
git clone https://github.com/emRival/jadwal-pelajaran-idn.git
cd jadwal-pelajaran-idn
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Firebase
Aplikasi ini menggunakan konfigurasi Firebase di `src/lib/firebase.ts`.
Saat ini konfigurasi sudah tertanam (hardcoded) untuk mempermudah development.
Jika Anda ingin menggunakan project Firebase sendiri:
1. Buat project baru di [Firebase Console](https://console.firebase.google.com/).
2. Buat aplikasi web baru di project tersebut.
3. Copy config `apiKey`, `authDomain`, dll.
4. Update file `src/lib/firebase.ts`.

### 4. Jalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

## 🗄️ Setup Database (Firestore)

Aplikasi menggunakan struktur data khusus di Firestore.
Path Root Database: `artifacts/default-app-id/public/data/` (lihat `src/lib/firebase.ts`).

### Koleksi (Collections)
Berikut adalah koleksi yang digunakan:

| Nama Koleksi | Fungsi | Struktur Dokumen |
| :--- | :--- | :--- |
| `schedules` | Menyimpan semua jadwal | `{ day, jp, mapel, guru, classes: [], room }` |
| `guru` | Data Guru | `{ name, tasks: [] }` |
| `kelas` | Data Kelas | `{ name }` |
| `mapel` | Data Mata Pelajaran | `{ name }` |
| `tugas` | Daftar Tugas Tambahan | `{ name, jp }` |
| `config` | Pengaturan Aplikasi | Dokumen: `signatures`, `jpCalculation`, `piketApi` |
| `infoLinks` | Link Informasi di Header | `{ title, url }` |
| `admins` | Daftar Admin (Auth) | ID Dokumen = UID User, Isi: `{ email, role: 'admin' }` |

### Security Rules
Agar aplikasi aman, gunakan aturan berikut di Firestore Rules:
- **Public Read**: Semua orang bisa melihat jadwal.
- **Admin Write**: Hanya admin yang bisa mengubah data.

Contoh Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fungsi cek admin
    function isAdmin() {
      return request.auth != null && exists(/databases/$(database)/documents/artifacts/default-app-id/public/data/admins/$(request.auth.uid));
    }

    // Path utama aplikasi
    match /artifacts/default-app-id/public/data/{collection}/{docId} {
      allow read: if true; // Semua bisa baca
      allow write: if isAdmin(); // Hanya admin bisa tulis
    }
    
    // Khusus admin list
    match /artifacts/default-app-id/public/data/admins/{userId} {
      allow read: if request.auth != null;
      allow write: if false; // Atur manual via Console untuk keamanan
    }
  }
}
```

## 🔐 Setup Login Admin
1. Login dengan Google di aplikasi.
2. Buka Firebase Console -> Firestore.
3. Buka koleksi `artifacts/default-app-id/public/data/admins`.
4. Buat dokumen baru dengan **Document ID** = **UID User** Anda (lihat di menu Authentication).
5. Isi field:
   - `email`: email-google-anda@gmail.com
   - `role`: "admin"
6. Refresh aplikasi, menu Admin akan muncul di header.

## 🚀 Deployment (Vercel)

Aplikasi sudah dikonfigurasi untuk Vercel (SPA routing lewat `vercel.json`).

1. Push kode ke GitHub.
2. Buka [Vercel Dashboard](https://vercel.com/dashboard).
3. Import project dari GitHub.
4. Deploy.

**PENTING**:
Agar Login Google berfungsi, tambahkan domain Vercel (contoh: `app-anda.vercel.app`) ke **Firebase Console -> Authentication -> Settings -> Authorized Domains**.

---
*Dibuat oleh Tim IT IDN Boarding School Bogor*
