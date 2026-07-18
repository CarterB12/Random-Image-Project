import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { sanitizeTags } from "@/lib/uploads"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (max 10MB)" }, { status: 400 })
  }

  const uploaderRaw = formData.get("uploader")
  const uploader = (typeof uploaderRaw === "string" ? uploaderRaw : "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, 40)
  const safeUploader = uploader || "Anonymous"

  const tagsRaw = formData.get("tags")
  const tags = sanitizeTags(typeof tagsRaw === "string" ? tagsRaw : "")

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const pathname =
    tags.length > 0
      ? `uploads/${Date.now()}/${safeUploader}/${tags.join(",")}/${safeName}`
      : `uploads/${Date.now()}/${safeUploader}/${safeName}`
  const blob = await put(pathname, file, {
    access: "public",
  })

  return NextResponse.json({ url: blob.url, name: safeName, uploader: safeUploader, tags })
}
