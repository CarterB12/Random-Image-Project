import { NextResponse } from "next/server"
import { list } from "@vercel/blob"
import { parseUploadPathname } from "@/lib/uploads"

export async function GET() {
  const { blobs } = await list({ prefix: "uploads/" })

  return NextResponse.json({
    images: blobs.map((b) => {
      const { name, uploader } = parseUploadPathname(b.pathname)
      return { url: b.url, name, uploader: uploader || undefined, uploadedAt: b.uploadedAt }
    }),
  })
}
