import { NextResponse } from "next/server"
import { list } from "@vercel/blob"

export async function GET() {
  const { blobs } = await list({ prefix: "uploads/" })

  return NextResponse.json({
    images: blobs.map((b) => ({
      url: b.url,
      name: b.pathname.replace(/^uploads\/\d+-/, ""),
    })),
  })
}
