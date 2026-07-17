import { NextResponse } from "next/server"

// Requesting a random category gives each request its own separate 500-hit
// pool (Pixabay caps totalHits at 500 regardless of query), so cycling
// through categories meaningfully increases the total pool of reachable photos.
const CATEGORIES = [
  "backgrounds",
  "fashion",
  "nature",
  "science",
  "education",
  "feelings",
  "health",
  "people",
  "religion",
  "places",
  "animals",
  "industry",
  "computer",
  "food",
  "sports",
  "transportation",
  "travel",
  "buildings",
  "business",
  "music",
]

const MAX_ATTEMPTS = 5

export async function GET() {
  let lastError = { status: 502, message: "Failed to fetch photo from Pixabay" }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    // Pixabay caps results at 500 hits regardless of query, so with per_page=100
    // only pages 1-5 are ever valid — higher pages return a 400 error. A given
    // category can still have fewer than 500 real results, hence the retry loop.
    const page = Math.floor(Math.random() * 5) + 1

    const res = await fetch(
      `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&image_type=photo&category=${category}&per_page=100&page=${page}`,
    )

    if (!res.ok) {
      lastError = { status: res.status, message: "Failed to fetch photo from Pixabay" }
      continue
    }

    const data = await res.json()
    const hits = data.hits as { largeImageURL: string; user: string }[] | undefined

    if (!hits?.length) {
      lastError = { status: 502, message: "No photo returned from Pixabay" }
      continue
    }

    const photo = hits[Math.floor(Math.random() * hits.length)]
    return NextResponse.json({ url: photo.largeImageURL, credit: photo.user })
  }

  return NextResponse.json({ error: lastError.message }, { status: lastError.status })
}
