# Random Image Generator

A Next.js app that shows a fresh random photo with a single click. Includes swipe-to-like/skip gestures, a favorites gallery with zip download, a community gallery, and an admin upload flow.

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production build
- `npm run lint` — run ESLint

## Environment Variables

Create a `.env.local` file with the following variables:

| Variable | Purpose |
| --- | --- |
| `PEXELS_API_KEY` | API key for fetching images from Pexels |
| `UNSPLASH_ACCESS_KEY` | Access key for fetching images from Unsplash |
| `PIXABAY_API_KEY` | API key for fetching images from Pixabay |
| `BLOB_READ_WRITE_TOKEN` | Token for reading/writing uploads to Vercel Blob storage |
| `ADMIN_PASSCODE` | Passcode that gates the admin upload page |

## Project Structure

- `app/` — Next.js App Router pages and API routes
- `components/` — UI components, including the main `RandomImage` view
- `lib/` — shared utilities (favorites, uploads, zip export)
