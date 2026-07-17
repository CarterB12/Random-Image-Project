import { NextResponse } from "next/server"

export async function GET() {
  const res = await fetch("https://api.unsplash.com/photos/random", {
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch photo from Unsplash" }, { status: res.status })
  }

  const photo = await res.json()

  if (!photo?.urls?.regular) {
    return NextResponse.json({ error: "No photo returned from Unsplash" }, { status: 502 })
  }

  return NextResponse.json({
    url: photo.urls.regular,
    credit: photo.user?.name,
  })
}
