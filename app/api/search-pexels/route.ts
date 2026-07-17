import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  }

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20`,
    {
      headers: {
        Authorization: process.env.PEXELS_API_KEY!,
      },
    },
  )

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to search Pexels" }, { status: res.status })
  }

  const data = await res.json()
  const photos = data.photos as { src: { large: string }; photographer: string }[] | undefined

  if (!photos?.length) {
    return NextResponse.json({ error: "No results from Pexels" }, { status: 404 })
  }

  const photo = photos[Math.floor(Math.random() * photos.length)]

  return NextResponse.json({
    url: photo.src.large,
    credit: photo.photographer,
  })
}
