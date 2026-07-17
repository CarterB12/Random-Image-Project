"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { readFavorites, writeFavorites, type FavoriteImage } from "@/lib/favorites"

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteImage[]>([])
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null)

  useEffect(() => {
    setFavorites(readFavorites())
  }, [])

  const remove = (url: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.url !== url)
      writeFavorites(next)
      return next
    })
  }

  const download = async (favorite: FavoriteImage) => {
    setDownloadingUrl(favorite.url)
    try {
      const res = await fetch(favorite.url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = favorite.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setDownloadingUrl(null)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" aria-hidden="true" />
            <span className="sr-only">Back</span>
          </Link>
          <h1 className="text-2xl font-semibold">Favorites ({favorites.length})</h1>
        </div>
        {favorites.length === 0 ? (
          <p className="text-muted-foreground">
            No favorites yet. Tap the heart on an image to save it here.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {favorites.map((favorite) => (
              <div key={favorite.url} className="overflow-hidden rounded-lg border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={favorite.url}
                  alt={favorite.name}
                  className="aspect-square w-full object-cover"
                  crossOrigin="anonymous"
                />
                <div className="p-2">
                  <p className="truncate text-xs text-muted-foreground" title={favorite.sourceName}>
                    {favorite.sourceName}
                  </p>
                  {favorite.credit && (
                    <p className="truncate text-xs text-muted-foreground" title={favorite.credit}>
                      Photo by {favorite.credit}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() => download(favorite)}
                      disabled={downloadingUrl === favorite.url}
                      aria-label={`Download ${favorite.name}`}
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => remove(favorite.url)}
                      aria-label={`Remove ${favorite.name} from favorites`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
