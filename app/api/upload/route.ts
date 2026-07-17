import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const blob = await put(`uploads/${Date.now()}-${safeName}`, file, {
    access: "public",
  })

  return NextResponse.json({ url: blob.url, name: safeName })
}
