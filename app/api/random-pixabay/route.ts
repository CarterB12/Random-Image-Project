import { NextResponse } from "next/server"

export async function GET() {
  // Pixabay caps results at 500 hits regardless of query, so with per_page=100
  // only pages 1-5 are ever valid — higher pages return a 400 error.
  const page = Math.floor(Math.random() * 5) + 1

  const res = await fetch(
    `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&image_type=photo&per_page=100&page=${page}`,
  )

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch photo from Pixabay" }, { status: res.status })
  }

  const data = await res.json()
  const hits = data.hits as { largeImageURL: string; user: string }[] | undefined

  if (!hits?.length) {
    return NextResponse.json({ error: "No photo returned from Pixabay" }, { status: 502 })
  }

  const photo = hits[Math.floor(Math.random() * hits.length)]

  return NextResponse.json({
    url: photo.largeImageURL,
    credit: photo.user,
  })
}
