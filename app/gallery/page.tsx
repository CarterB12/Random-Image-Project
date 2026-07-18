"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Heart, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { readFavorites, writeFavorites } from "@/lib/favorites"

type GalleryImage = { url: string; name: string; uploader?: string; uploadedAt: string }

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<GalleryImage | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [favorites, setFavorites] = useState<ReturnType<typeof readFavorites>>([])

  useEffect(() => {
    setFavorites(readFavorites())
    fetch("/api/uploads")
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...(data.images ?? [])].sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
        )
        setImages(sorted)
      })
      .finally(() => setLoading(false))
  }, [])

  const download = useCallback(async (image: GalleryImage) => {
    setDownloading(true)
    try {
      const res = await fetch(image.url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = image.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setDownloading(false)
    }
  }, [])

  const toggleFavorite = useCallback((image: GalleryImage) => {
    setFavorites((prev) => {
      const next = prev.some((f) => f.url === image.url)
        ? prev.filter((f) => f.url !== image.url)
        : [
            ...prev,
            {
              url: image.url,
              name: image.name,
              sourceName: `Community upload: ${image.name.replace(/\.[^.]+$/, "")}`,
              credit: image.uploader,
              savedAt: Date.now(),
            },
          ]
      writeFavorites(next)
      return next
    })
  }, [])

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" aria-hidden="true" />
            <span className="sr-only">Back</span>
          </Link>
          <h1 className="text-2xl font-semibold">Community gallery ({images.length})</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-muted-foreground">No community uploads yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image) => (
              <button
                key={image.url}
                onClick={() => setSelected(image)}
                className="overflow-hidden rounded-lg border border-border bg-card text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.name}
                  className="aspect-square w-full object-cover"
                  crossOrigin="anonymous"
                />
                <div className="p-2">
                  <p className="truncate text-xs text-muted-foreground" title={image.uploader ?? "Anonymous"}>
                    by {image.uploader || "Anonymous"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">by {selected.uploader || "Anonymous"}</p>
              <button onClick={() => setSelected(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={selected.name}
                className="max-h-[60vh] w-full object-contain"
                crossOrigin="anonymous"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => download(selected)} disabled={downloading}>
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                Download
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => toggleFavorite(selected)}
                aria-label="Save to favorites"
              >
                <Heart
                  className={`size-4 ${favorites.some((f) => f.url === selected.url) ? "fill-current text-destructive" : ""}`}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
