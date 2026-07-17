import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  }

  const res = await fetch(
    `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=20`,
  )

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to search Pixabay" }, { status: res.status })
  }

  const data = await res.json()
  const hits = data.hits as { largeImageURL: string; user: string }[] | undefined

  if (!hits?.length) {
    return NextResponse.json({ error: "No results from Pixabay" }, { status: 404 })
  }

  const photo = hits[Math.floor(Math.random() * hits.length)]

  return NextResponse.json({
    url: photo.largeImageURL,
    credit: photo.user,
  })
}
