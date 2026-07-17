"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Download, Loader2, Maximize2, Minimize2, Shuffle, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

const WIDTH = 1200
const HEIGHT = 800
const SOURCES = [
  {
    name: "Lorem Picsum",
    ext: "jpg",
    build: (seed: number) => `https://picsum.photos/seed/${seed}/${WIDTH}/${HEIGHT}`,
  },
  {
    name: "LoremFlickr",
    ext: "jpg",
    build: (seed: number) => `https://loremflickr.com/${WIDTH}/${HEIGHT}?lock=${seed}`,
  },
  {
    name: "Pexels",
    ext: "jpg",
    dynamic: true,
    endpoint: "/api/random-photo",
  },
  {
    name: "Unsplash",
    ext: "jpg",
    dynamic: true,
    endpoint: "/api/random-unsplash",
  },
  {
    name: "Pixabay",
    ext: "jpg",
    dynamic: true,
    endpoint: "/api/random-pixabay",
  },
]

type UploadedImage = { id: number; url: string; name: string }

export function RandomImage() {
  const [seed, setSeed] = useState(1)
  const [sourceIndex, setSourceIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [dynamicUrl, setDynamicUrl] = useState("")
  const [loadId, setLoadId] = useState(0)
  const [fillFrame, setFillFrame] = useState(true)
  const [uploads, setUploads] = useState<UploadedImage[]>([])
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadsRef = useRef<UploadedImage[]>([])
  const nextUploadId = useRef(0)

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  // Revoke every uploaded object URL when the component unmounts.
  useEffect(() => {
    return () => {
      uploadsRef.current.forEach((u) => URL.revokeObjectURL(u.url))
    }
  }, [])

  const source = SOURCES[sourceIndex]
  const activeUpload = uploads.find((u) => u.id === activeUploadId)
  const url = activeUpload ? activeUpload.url : source.dynamic ? dynamicUrl : source.build!(seed)
  const sourceName = activeUpload ? `Your upload: ${activeUpload.name}` : source.name

  const shuffle = useCallback(async () => {
    setLoading(true)
    setLoadId((id) => id + 1)
    const currentUploads = uploadsRef.current
    const poolSize = SOURCES.length + currentUploads.length
    const pick = Math.floor(Math.random() * poolSize)

    if (pick < SOURCES.length) {
      setActiveUploadId(null)
      const newSeed = Math.floor(Math.random() * 100000)
      setSourceIndex(pick)
      setSeed(newSeed)

      const newSource = SOURCES[pick]
      if (newSource.dynamic) {
        const res = await fetch(newSource.endpoint!)
        const data = await res.json()
        setDynamicUrl(data.url ?? "")
      }
    } else {
      setActiveUploadId(currentUploads[pick - SOURCES.length].id)
    }
  }, [])

  useEffect(() => {
    shuffle()
  }, [shuffle])

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const id = nextUploadId.current++
    setUploads((prev) => [...prev, { id, url: URL.createObjectURL(file), name: file.name }])
    setActiveUploadId(id)
    setLoading(true)
    setLoadId((n) => n + 1)
  }, [])

  const download = useCallback(async () => {
    try {
      setDownloading(true)
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = activeUpload ? activeUpload.name : `random-image-${seed}.${source.ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setDownloading(false)
    }
  }, [url, seed, source.ext, activeUpload])

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Random Image Generator
        </h1>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          Shuffle for a fresh image and download your favorite.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="relative flex aspect-[3/2] items-center justify-center bg-muted">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading image</span>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={loadId}
            src={url || "/placeholder.svg"}
            alt="Random image"
            className={`h-full w-full ${fillFrame ? "object-cover" : "object-contain"}`}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            crossOrigin="anonymous"
          />
        </div>
        <div className="flex gap-2 p-4">
          <Button className="flex-1" onClick={shuffle}>
            <Shuffle className="size-4" aria-hidden="true" />
            Shuffle
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload your own image"
            title="Upload your own image"
          >
            <Upload className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setFillFrame((f) => !f)}
            aria-label={fillFrame ? "Switch to fit (show full image)" : "Switch to fill (crop to frame)"}
            title={fillFrame ? "Fit: show full image" : "Fill: crop to frame"}
          >
            {fillFrame ? (
              <Minimize2 className="size-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button variant="secondary" size="icon" onClick={download} disabled={downloading || loading} aria-label="Download" title="Download">
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Current source: {sourceName}.</p>
    </div>
  )
}