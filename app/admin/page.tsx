"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type UploadedImage = { url: string; name: string; uploader?: string; uploadedAt: string }

const STORAGE_KEY = "admin-passcode"

export default function AdminPage() {
  const [passcode, setPasscode] = useState("")
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState("")
  const [checking, setChecking] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)

  const loadImages = useCallback(async (code: string) => {
    setLoadingImages(true)
    setError("")
    try {
      const res = await fetch("/api/admin/uploads", {
        headers: { "x-admin-passcode": code },
      })
      if (res.status === 401) {
        setError("Incorrect passcode")
        setAuthed(false)
        sessionStorage.removeItem(STORAGE_KEY)
        return
      }
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setImages(data.images ?? [])
      setAuthed(true)
      sessionStorage.setItem(STORAGE_KEY, code)
    } catch {
      setError("Something went wrong loading the gallery")
    } finally {
      setLoadingImages(false)
    }
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      setPasscode(saved)
      loadImages(saved)
    }
  }, [loadImages])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setChecking(true)
      await loadImages(passcode)
      setChecking(false)
    },
    [passcode, loadImages],
  )

  const handleDelete = useCallback(
    async (url: string) => {
      setDeletingUrl(url)
      try {
        const res = await fetch("/api/admin/uploads", {
          method: "DELETE",
          headers: {
            "x-admin-passcode": passcode,
            "content-type": "application/json",
          },
          body: JSON.stringify({ url }),
        })
        if (res.ok) {
          setImages((prev) => prev.filter((img) => img.url !== url))
        }
      } finally {
        setDeletingUrl(null)
      }
    },
    [passcode],
  )

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
          <h1 className="text-center text-xl font-semibold">Admin</h1>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring"
            autoFocus
          />
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={checking || !passcode}>
            {checking ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Enter"}
          </Button>
        </form>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold">Community uploads ({images.length})</h1>
        {loadingImages ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-muted-foreground">No uploads yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img) => (
              <div key={img.url} className="overflow-hidden rounded-lg border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.name} className="aspect-square w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="min-w-0 truncate text-xs text-muted-foreground" title={img.name}>
                    {img.name}
                    {img.uploader && <span className="block truncate">by {img.uploader}</span>}
                  </span>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => handleDelete(img.url)}
                    disabled={deletingUrl === img.url}
                    aria-label={`Delete ${img.name}`}
                  >
                    {deletingUrl === img.url ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
