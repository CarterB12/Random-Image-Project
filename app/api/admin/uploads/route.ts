import { NextResponse } from "next/server"
import { del, list } from "@vercel/blob"
import { parseUploadPathname } from "@/lib/uploads"

function isAuthorized(request: Request) {
  const passcode = request.headers.get("x-admin-passcode")
  return Boolean(process.env.ADMIN_PASSCODE) && passcode === process.env.ADMIN_PASSCODE
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { blobs } = await list({ prefix: "uploads/" })

  const images = blobs
    .map((b) => {
      const { name, uploader } = parseUploadPathname(b.pathname)
      return { url: b.url, name, uploader: uploader || undefined, uploadedAt: b.uploadedAt }
    })
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

  return NextResponse.json({ images })
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  await del(url)

  return NextResponse.json({ success: true })
}
