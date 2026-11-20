# Sistem Informasi Panti Asuhan & Lembaga Sosial — Pontianak Barat

Proyek PjBL UAS Sistem Informasi Geografis Dasar, Kelompok 4.
Aplikasi peta web yang menampilkan 24 panti asuhan dan lembaga sosial, jalan utama,
dan zona sosial, dengan data yang dipersiapkan di QGIS dan dilayani lewat Node.js + Express.

## Status pengerjaan

| Tahap | Isi | Status |
|---|---|---|
| SK-1 | Akuisisi data 4 format (CSV, SHP, GeoJSON, GPKG) | Selesai |
| SK-2 | Manajemen vektor di QGIS | Selesai |
| SK-3 | Backend API + peta Leaflet dasar + digitasi web | Selesai |
| SK-4 | Frontend: filter kategori, state terpusat, MarkerCluster | Selesai |
| SK-5 | Laporan perbandingan QGIS vs Leaflet | Belum |

## Struktur repo

```
QGIS/
├── SIGDTUBES.qgz        proyek QGIS
└── data/                semua data mentah dan hasil olahan (CSV, SHP, GPKG, GeoJSON)

sig-backend/
├── server.js            server Express + API
├── package.json
├── data/                HANYA 3 file GeoJSON yang dibaca server
│   ├── sosial_west.geojson
│   ├── jalan_utama.geojson
│   └── zona_sosial.geojson
└── public/
    ├── index.html
    ├── style.css
    ├── app.js           logika peta (dikerjakan di SK-4)
    └── lib/             Leaflet dan Leaflet.draw (lokal, agar bisa offline)
```

## Cara menjalankan (agar tampilannya sama)

Syarat: Node.js versi 18 atau lebih baru (cek dengan `node -v`).

```
git clone https://github.com/weirecoo/SIGD-Panti-Asuhan-Lembaga-Sosial-di-Pontianak.git
cd SIGD-Panti-Asuhan-Lembaga-Sosial-di-Pontianak/sig-backend
npm install
npm start
```

Jika berhasil, terminal menampilkan `Server berjalan di http://localhost:3000`.
Buka `http://localhost:3000/` lalu tekan Ctrl+F5.

Tampilan yang benar:
- 24 titik dengan 3 warna: merah (panti asuhan), biru (panti jompo), oranye (rumah singgah)
- garis cokelat (jalan utama) dan 3 poligon ungu (zona sosial)
- kontrol layer di kanan atas dan ikon poligon di bawah tombol zoom
- klik titik: muncul popup nama, jenis, jumlah anak, izin, kontak

Catatan: peta dasar OpenStreetMap butuh internet. Tanpa internet, latar abu-abu
tetapi titik, jalan, dan poligon tetap tampil.

Menghentikan server: Ctrl+C. Setelah mengubah `server.js`, jalankan ulang `npm start`.
Mengubah file di `public/` atau `data/` cukup Ctrl+F5 di browser.

## API

| Method | Alamat | Fungsi |
|---|---|---|
| GET | `/api/data/sosial` | 24 titik lembaga sosial |
| GET | `/api/data/jalan` | 30 ruas jalan utama |
| GET | `/api/data/zona` | poligon zona sosial |
| GET | `/api/stats/jenis` | jumlah per jenis: `panti_asuhan` 21, `panti_jompo` 1, `rumah_singgah` 2 |
| POST | `/api/feature/zona` | simpan poligon baru (body: `{ "feature": <GeoJSON Feature> }`) |

`POST /api/feature/zona` tidak bisa dibuka lewat address bar (itu GET). Gunakan peta:
gambar poligon, klik Finish, isi nama zona.

## Kontrak data (jangan diubah tanpa kabar)

- CRS semua GeoJSON: EPSG:4326
- Properti `sosial_west.geojson`: `nama`, `jenis_lembaga`, `latitude`, `longitude`,
  `jumlah_anak`, `izin`, `kontak`, `kode_lembaga`
- Nilai `jenis_lembaga`: `panti_asuhan`, `panti_jompo`, `rumah_singgah`
- `izin`: `Aktif` atau `Tidak Diketahui`
- `jumlah_anak`: angka, atau `null` jika tidak tercatat. Nilai 0 (Graha Werdha) sah dari
  data dinas. Jangan mengganti `null` dengan 0.
- Properti zona: `nama_zona`
- Nama file di `sig-backend/data/` tetap. Jika diganti, ubah juga objek `LAYER` di `server.js`.

## Panduan untuk SK-4 (frontend)

Kerjakan di `sig-backend/public/app.js` dan `index.html`. Tidak perlu mengubah `server.js`.

- Tambahkan `state = { filters: { panti_asuhan: true, panti_jompo: true, rumah_singgah: true }, cluster: false }`
- Buat fungsi `renderSosial()` yang membaca `state`
- MarkerCluster hanya menerima `L.marker` + `L.divIcon`, bukan `L.circleMarker`
- Simpan plugin MarkerCluster secara lokal di `public/lib/markercluster/` (lab tanpa internet),
  lalu panggil dari `index.html`
- Warna kategori sudah ada di konstanta `WARNA_JENIS`, gunakan yang sama

## Panduan untuk SK-5 (laporan)

- Bahan perbandingan: folder `QGIS/` (simbologi Categorized, label, klaster) dan
  `sig-backend/public/app.js`
- Poin dari lembar tugas: alasan GeoJSON dipilih, `bindPopup` vs `bindTooltip`, evaluasi
  QGIS + Leaflet untuk data kesejahteraan sosial
- Batasan data yang perlu dicatat di laporan: `batas_kec_west.shp` sebenarnya batas seluruh
  Kota Pontianak (bukan kecamatan), dan `jumlah_anak` kosong pada 10 dari 24 lembaga

## Alur kerja bersama

1. Sebelum mulai kerja: `git pull`
2. Setelah selesai satu bagian: `git add .` lalu `git commit -m "pesan singkat"` lalu `git push`
3. Pembagian file agar tidak bentrok: SK-3 memegang `server.js`; SK-4 memegang `public/`;
   SK-5 memegang laporan dan membaca folder `QGIS/`
4. `data/zona_sosial.geojson` hanya boleh berisi 3 poligon resmi (Zona Barat, Utara, Timur).
   Hapus poligon uji sebelum commit.
5. Jangan commit `node_modules/`. Pasang ulang dengan `npm install`.