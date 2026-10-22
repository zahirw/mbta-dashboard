# MBTA Vehicle Dashboard

Dashboard untuk memantau posisi kendaraan (bus) secara live menggunakan [MBTA V3 API](https://api-v3.mbta.com/docs/swagger/index.html). Pengguna dapat memfilter berdasarkan route dan trip, melihat daftar kendaraan dengan pagination, lalu membuka detail kendaraan beserta posisinya di peta.

## Demo Online

Jika tidak memungkinkan untuk setup di lokal, aplikasi dapat langsung dibuka melalui Vercel:

**<https://transjakarta-zahir.vercel.app/>**

## Menjalankan di Lokal

### Prasyarat

- Node.js **20.19+** atau **22.12+** (dibutuhkan Vite 8)
- npm

### Langkah-langkah

```bash
# 1. Clone repository
git clone https://github.com/zahirw/mbta-dashboard.git
cd mbta-dashboard

# 2. Install dependency
npm install

# 3. Siapkan environment variable
cp .env.example .env

# 4. Jalankan dev server
npm run dev
```

Buka alamat yang tampil di terminal (default <http://localhost:5173>).

### Environment Variable

| Variable             | Wajib | Keterangan                                                                                                                      |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_MBTA_BASE_URL` | Ya    | Base URL MBTA API. Gunakan `https://api-v3.mbta.com` (sudah terisi di `.env.example`).                                          |
| `VITE_MBTA_API_KEY`  | Tidak | API key dari <https://api-v3.mbta.com/register>. Tanpa key aplikasi tetap berjalan, tetapi rate limit per IP lebih ketat (429). |

> Variable berawalan `VITE_` ikut ter-bundle ke sisi client, jadi API key tidak bersifat rahasia.

### Script Lain

| Perintah          | Fungsi                                       |
| ----------------- | -------------------------------------------- |
| `npm run build`   | Type-check (`tsc -b`) lalu build production  |
| `npm run preview` | Menjalankan hasil build secara lokal         |
| `npm run lint`    | Lint dengan [Oxlint](https://oxc.rs)         |

## Arsitektur

Aplikasi ini adalah **single-page application (SPA) client-side only** — tidak ada backend sendiri. Browser memanggil MBTA API langsung.

### Tech Stack

- **React 19 + TypeScript** dengan **Vite** sebagai bundler
- **TanStack Query** untuk data fetching, caching, retry, dan polling
- **React Router** untuk routing dan state di URL
- **Tailwind CSS v4** untuk styling
- **Leaflet / react-leaflet** untuk peta (tile OpenStreetMap)

### Struktur Folder

```
src/
├── api/mbta/       # Lapisan akses data MBTA API
│   ├── client.ts   # fetch wrapper, MbtaApiError, pembacaan rate-limit header
│   ├── retry.ts    # kebijakan retry & backoff
│   ├── vehicles.ts # query options + hooks kendaraan
│   ├── routes.ts   # hooks route (infinite query)
│   ├── trips.ts    # hooks trip (infinite query)
│   └── types.ts    # tipe response JSON:API
├── components/     # Komponen UI (VehicleCard, VehicleMap, Pagination, dropdown, modal, dll.)
├── routes/         # Halaman: Layout (header) dan Home (daftar kendaraan)
├── lib/            # Helper murni (queryClient, format waktu, status kendaraan)
└── main.tsx        # Entry point: QueryClientProvider + RouterProvider
```

### Keputusan Desain

- **Lapisan API terpisah.** Komponen tidak memanggil `fetch` langsung; semuanya lewat hook di `src/api/mbta/` (`useVehicles`, `useVehicle`, dst.). Query key dan pembuatan query string dikelola di satu tempat per resource.
- **Error terstruktur.** `mbtaFetch` membungkus semua kegagalan menjadi `MbtaApiError` (status, detail, parameter yang ditolak, info rate-limit) sehingga UI cukup menampilkan `error.message`.
- **Retry yang selektif.** Error 4xx (parameter/key salah) tidak di-retry, 429 di-retry sekali dengan menunggu sampai window rate-limit reset, error lain memakai exponential backoff (maks. 30 detik).
- **URL sebagai sumber state.** Filter (`route`, `trip`), `page`, `pageSize`, dan kendaraan yang dibuka (`vehicle`) disimpan di query string, sehingga halaman bisa di-refresh atau dibagikan dengan kondisi yang sama. Nilai default sengaja tidak ditulis ke URL.
- **Data live.** Posisi kendaraan dianggap stale setelah 10 detik, dan modal detail melakukan polling berkala (`refetchInterval`) untuk memperbarui posisi di peta.
- **Pagination tanpa total count.** MBTA tidak mengembalikan total data, sehingga jumlah dihitung dari query ringan terpisah (hanya field `label`, tanpa pagination). Hasil halaman diurutkan berdasarkan `label` agar urutan stabil, dan `keepPreviousData` menjaga data lama tetap tampil saat memuat halaman/filter berikutnya.
- **Batasan API.** MBTA menolak `filter[trip]` jika digabung dengan filter lain, sehingga ketika trip dipilih, filter route diabaikan. Mengganti route juga mereset pilihan trip.

## Deployment

Di-deploy ke [Vercel](https://vercel.com). Konfigurasi ada di [vercel.json](vercel.json): framework Vite, output `dist`, dan *rewrite* semua path ke `index.html` agar routing client-side berfungsi saat halaman di-refresh. Set `VITE_MBTA_BASE_URL` (dan opsional `VITE_MBTA_API_KEY`) di *Environment Variables* project Vercel.
