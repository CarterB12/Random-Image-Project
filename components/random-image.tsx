"use client"
import { useCallback, useEffect, useState } from "react"
import { Download, Loader2, Shuffle } from "lucide-react"
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

export function RandomImage() {
  const [seed, setSeed] = useState(1)
  const [sourceIndex, setSourceIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [dynamicUrl, setDynamicUrl] = useState("")
  const [loadId, setLoadId] = useState(0)

  const source = SOURCES[sourceIndex]
  const url = source.dynamic ? dynamicUrl : source.build!(seed)

  const shuffle = useCallback(async () => {
    setLoading(true)
    setLoadId((id) => id + 1)
    const newIndex = Math.floor(Math.random() * SOURCES.length)
    const newSeed = Math.floor(Math.random() * 100000)
    setSourceIndex(newIndex)
    setSeed(newSeed)

    const newSource = SOURCES[newIndex]
    if (newSource.dynamic) {
      const res = await fetch(newSource.endpoint!)
      const data = await res.json()
      setDynamicUrl(data.url ?? "")
    }
  }, [])

  useEffect(() => {
    shuffle()
  }, [shuffle])

  const download = useCallback(async () => {
    try {
      setDownloading(true)
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `random-image-${seed}.${source.ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setDownloading(false)
    }
  }, [url, seed, source.ext])

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
            className="h-full w-full object-cover"
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
          <Button variant="secondary" onClick={download} disabled={downloading || loading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            Download
          </Button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Current source: {source.name}.</p>
    </div>
  )
}