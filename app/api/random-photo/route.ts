import { NextResponse } from "next/server"

export async function GET() {
  const page = Math.floor(Math.random() * 1000) + 1

  const res = await fetch(`https://api.pexels.com/v1/curated?per_page=1&page=${page}`, {
    headers: {
      Authorization: process.env.PEXELS_API_KEY!,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch photo from Pexels" }, { status: res.status })
  }

  const data = await res.json()
  const photo = data.photos?.[0]

  if (!photo) {
    return NextResponse.json({ error: "No photo returned from Pexels" }, { status: 502 })
  }

  return NextResponse.json({
    url: photo.src.large,
    credit: photo.photographer,
  })
}