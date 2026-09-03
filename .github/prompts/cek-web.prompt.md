---
name: "Cek Web"
description: "Audit file HTML web untuk UI responsif, fungsi, aksesibilitas, performa, SEO, dan keamanan dasar"
argument-hint: "File HTML yang ingin diperiksa, misalnya #file:reddit98 (2).html"
agent: "agent"
---
Audit file HTML yang disebutkan pengguna. Jika tidak disebutkan, gunakan file HTML aktif; jika target tetap ambigu, tanyakan satu pertanyaan singkat.

Periksa hanya berdasarkan bukti dari kode dan hasil pengujian yang tersedia:
- UI dan responsivitas pada viewport desktop serta mobile
- fungsi utama, interaksi, formulir, tautan, dan error runtime
- aksesibilitas: semantic HTML, label, alt text, keyboard, focus, serta kontras yang dapat dinilai
- performa dan SEO: aset, loading, metadata, heading, serta struktur konten
- keamanan dasar: input tidak tepercaya, secret/data sensitif, external resource, dan praktik DOM berisiko

Buka halaman di browser lokal bila memungkinkan. Jangan mengubah file kecuali pengguna secara eksplisit meminta perbaikan.

Keluarkan laporan ringkas dalam format:

## Ringkasan
Status keseluruhan dan tiga temuan terpenting.

## Temuan
Untuk setiap temuan, tulis:
- tingkat: Kritis, Tinggi, Sedang, atau Rendah
- lokasi file dan baris
- bukti singkat
- dampak
- perbaikan minimum

Kelompokkan berdasarkan UI/Responsif, Fungsi, Aksesibilitas, Performa/SEO, dan Keamanan. Jangan mengarang hasil browser, error, skor, atau masalah yang tidak terverifikasi. Akhiri dengan prioritas perbaikan berurutan.