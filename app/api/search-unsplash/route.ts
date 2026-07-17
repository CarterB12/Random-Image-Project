import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  }

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    },
  )

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to search Unsplash" }, { status: res.status })
  }

  const data = await res.json()
  const results = data.results as { urls: { regular: string }; user: { name: string } }[] | undefined

  if (!results?.length) {
    return NextResponse.json({ error: "No results from Unsplash" }, { status: 404 })
  }

  const photo = results[Math.floor(Math.random() * results.length)]

  return NextResponse.json({
    url: photo.urls.regular,
    credit: photo.user?.name,
  })
}
