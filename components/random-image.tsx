"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Download,
  Heart,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Search,
  Shuffle,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageEditorDialog } from "@/components/image-editor-dialog"
import { readFavorites, writeFavorites } from "@/lib/favorites"

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

type UploadedImage = { url: string; name: string }

const SEARCH_SOURCES = [
  { name: "Pexels", endpoint: "/api/search-pexels" },
  { name: "Unsplash", endpoint: "/api/search-unsplash" },
  { name: "Pixabay", endpoint: "/api/search-pixabay" },
]

const RECENT_HISTORY_SIZE = 8
const MAX_SHUFFLE_ATTEMPTS = 6
const COMMUNITY_NAME = "Community uploads"
const ALL_CATEGORY_NAMES = [...SOURCES.map((s) => s.name), COMMUNITY_NAME]
const FILTER_STORAGE_KEY = "enabled-sources-v1"

function readEnabledSources(): string[] {
  if (typeof window === "undefined") return ALL_CATEGORY_NAMES
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return ALL_CATEGORY_NAMES
    const parsed = JSON.parse(raw) as string[]
    return parsed.length > 0 ? parsed : ALL_CATEGORY_NAMES
  } catch {
    return ALL_CATEGORY_NAMES
  }
}

export function RandomImage() {
  const [seed, setSeed] = useState(1)
  const [sourceIndex, setSourceIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingFile, setEditingFile] = useState<File | null>(null)
  const [dynamicUrl, setDynamicUrl] = useState("")
  const [credit, setCredit] = useState("")
  const [loadId, setLoadId] = useState(0)
  const [fillFrame, setFillFrame] = useState(true)
  const [slideshow, setSlideshow] = useState(false)
  const [favorites, setFavorites] = useState<ReturnType<typeof readFavorites>>([])
  const [uploads, setUploads] = useState<UploadedImage[]>([])
  const [activeUploadUrl, setActiveUploadUrl] = useState<string | null>(null)
  const [enabledSources, setEnabledSources] = useState<string[]>(ALL_CATEGORY_NAMES)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [searchProvider, setSearchProvider] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadsRef = useRef<UploadedImage[]>([])
  const recentHistoryRef = useRef<string[]>([])
  const enabledSourcesRef = useRef<string[]>(ALL_CATEGORY_NAMES)
  const searchQueryRef = useRef("")

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    setFavorites(readFavorites())
    setEnabledSources(readEnabledSources())
  }, [])

  useEffect(() => {
    enabledSourcesRef.current = enabledSources
  }, [enabledSources])

  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  const toggleSourceFilter = useCallback((name: string) => {
    setEnabledSources((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const source = SOURCES[sourceIndex]
  const activeUpload = uploads.find((u) => u.url === activeUploadUrl)
  const url = searchQuery ? dynamicUrl : activeUpload ? activeUpload.url : source.dynamic ? dynamicUrl : source.build!(seed)
  const sourceName = searchQuery
    ? `Search "${searchQuery}" via ${searchProvider}`
    : activeUpload
      ? `Community upload: ${activeUpload.name}`
      : source.name
  const isFavorited = favorites.some((f) => f.url === url)

  const shuffle = useCallback(async () => {
    setLoading(true)
    setLoadId((id) => id + 1)

    const query = searchQueryRef.current
    if (query) {
      for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt++) {
        const provider = SEARCH_SOURCES[Math.floor(Math.random() * SEARCH_SOURCES.length)]
        const res = await fetch(`${provider.endpoint}?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const resultUrl: string = data.url ?? ""

        if (resultUrl && recentHistoryRef.current.includes(resultUrl) && attempt < MAX_SHUFFLE_ATTEMPTS - 1) {
          continue
        }

        setActiveUploadUrl(null)
        setDynamicUrl(resultUrl)
        setCredit(data.credit ?? "")
        setSearchProvider(provider.name)
        if (resultUrl) {
          recentHistoryRef.current = [...recentHistoryRef.current, resultUrl].slice(-RECENT_HISTORY_SIZE)
        }
        return
      }
      return
    }

    const enabled = enabledSourcesRef.current
    const activeSourceIndices = SOURCES.map((_, i) => i).filter((i) => enabled.includes(SOURCES[i].name))
    const includeCommunity = enabled.includes(COMMUNITY_NAME)
    const activeUploads = includeCommunity ? uploadsRef.current : []

    // If nothing is actually selectable (e.g. every source unchecked, or only
    // an empty community pool left checked), fall back to everything rather
    // than leaving the app with nothing to shuffle.
    const nothingSelectable = activeSourceIndices.length === 0 && activeUploads.length === 0
    const effectiveSourceIndices = nothingSelectable ? SOURCES.map((_, i) => i) : activeSourceIndices
    const currentUploads = nothingSelectable ? uploadsRef.current : activeUploads
    const poolSize = effectiveSourceIndices.length + currentUploads.length

    let candidateIsUpload = false
    let candidateSourceIndex = 0
    let candidateSeed = 0
    let candidateUrl = ""
    let candidateCredit = ""

    for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt++) {
      const pick = Math.floor(Math.random() * poolSize)

      if (pick < effectiveSourceIndices.length) {
        const sourceIdx = effectiveSourceIndices[pick]
        const candidateSource = SOURCES[sourceIdx]
        const newSeed = Math.floor(Math.random() * 100000)
        let url: string
        let creditName = ""
        if (candidateSource.dynamic) {
          const res = await fetch(candidateSource.endpoint!)
          const data = await res.json()
          url = data.url ?? ""
          creditName = data.credit ?? ""
        } else {
          url = candidateSource.build!(newSeed)
        }

        if (url && recentHistoryRef.current.includes(url) && attempt < MAX_SHUFFLE_ATTEMPTS - 1) {
          continue
        }

        candidateIsUpload = false
        candidateSourceIndex = sourceIdx
        candidateSeed = newSeed
        candidateUrl = url
        candidateCredit = creditName
        break
      } else {
        const candidate = currentUploads[pick - effectiveSourceIndices.length]

        if (recentHistoryRef.current.includes(candidate.url) && attempt < MAX_SHUFFLE_ATTEMPTS - 1) {
          continue
        }

        candidateIsUpload = true
        candidateUrl = candidate.url
        break
      }
    }

    if (candidateIsUpload) {
      setActiveUploadUrl(candidateUrl)
      setCredit("")
    } else {
      setActiveUploadUrl(null)
      setSourceIndex(candidateSourceIndex)
      setSeed(candidateSeed)
      if (SOURCES[candidateSourceIndex].dynamic) {
        setDynamicUrl(candidateUrl)
      }
      setCredit(candidateCredit)
    }

    if (candidateUrl) {
      recentHistoryRef.current = [...recentHistoryRef.current, candidateUrl].slice(-RECENT_HISTORY_SIZE)
    }
  }, [])

  const performSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = searchInput.trim()
      if (!trimmed) return
      searchQueryRef.current = trimmed
      setSearchQuery(trimmed)
      recentHistoryRef.current = []
      shuffle()
    },
    [searchInput, shuffle],
  )

  const clearSearch = useCallback(() => {
    searchQueryRef.current = ""
    setSearchQuery("")
    setSearchInput("")
    setShowSearch(false)
    recentHistoryRef.current = []
    shuffle()
  }, [shuffle])

  // Load the shared gallery once on mount, then start shuffling.
  useEffect(() => {
    let cancelled = false
    fetch("/api/uploads")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const images: UploadedImage[] = data.images ?? []
        uploadsRef.current = images
        setUploads(images)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) shuffle()
      })
    return () => {
      cancelled = true
    }
  }, [shuffle])

  useEffect(() => {
    if (!slideshow) return
    const interval = setInterval(shuffle, 4000)
    return () => clearInterval(interval)
  }, [slideshow, shuffle])

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setEditingFile(file)
  }, [])

  const uploadEditedImage = useCallback(async (blob: Blob, fileName: string) => {
    setEditingFile(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", blob, fileName)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const newImage: UploadedImage = { url: data.url, name: data.name ?? fileName }
      setUploads((prev) => [...prev, newImage])
      setActiveUploadUrl(newImage.url)
      setCredit("")
      setLoading(true)
      setLoadId((n) => n + 1)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }, [])

  const fileName = activeUpload
    ? activeUpload.name
    : searchQuery
      ? `${searchQuery.trim().replace(/\s+/g, "-")}-${Date.now()}.jpg`
      : `random-image-${seed}.${source.ext}`

  const download = useCallback(async () => {
    try {
      setDownloading(true)
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setDownloading(false)
    }
  }, [url, fileName])

  const toggleFavorite = useCallback(() => {
    setFavorites((prev) => {
      const next = prev.some((f) => f.url === url)
        ? prev.filter((f) => f.url !== url)
        : [
            ...prev,
            {
              url,
              name: fileName,
              sourceName,
              credit: credit || undefined,
              savedAt: Date.now(),
            },
          ]
      writeFavorites(next)
      return next
    })
  }, [url, fileName, sourceName, credit])

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
        <div className="flex flex-col gap-2 p-4">
          <Button onClick={shuffle}>
            <Shuffle className="size-4" aria-hidden="true" />
            Shuffle
          </Button>
          <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setSlideshow((s) => !s)}
            aria-label={slideshow ? "Pause slideshow" : "Start slideshow"}
            title={slideshow ? "Pause slideshow" : "Start slideshow"}
          >
            {slideshow ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Share an image with the gallery"
            title="Share an image with the gallery"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
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
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFavorite}
            aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
            title={isFavorited ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart
              className={`size-4 ${isFavorited ? "fill-current text-destructive" : ""}`}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowFilters((s) => !s)}
            aria-label="Filter sources"
            title="Filter sources"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setShowSearch((s) => !s)}
            aria-label="Search by keyword"
            title="Search by keyword"
          >
            <Search className="size-4" aria-hidden="true" />
          </Button>
          </div>
        </div>
      </div>
      {showSearch && (
        <form onSubmit={performSearch} className="mt-4 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search a keyword, e.g. mountains"
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring"
          />
          <Button type="submit" disabled={!searchInput.trim()}>
            Search
          </Button>
          {searchQuery && (
            <Button type="button" variant="secondary" size="icon" onClick={clearSearch} aria-label="Clear search" title="Clear search">
              <X className="size-4" aria-hidden="true" />
            </Button>
          )}
        </form>
      )}
      {showFilters && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium">Sources to include</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_CATEGORY_NAMES.map((name) => (
              <label key={name} className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={enabledSources.includes(name)}
                  onChange={() => toggleSourceFilter(name)}
                  className="size-4 rounded border-border accent-foreground"
                />
                {name}
              </label>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Current source: {sourceName}.{credit && ` Photo by ${credit}.`}
      </p>
      <p className="mt-1 text-center text-xs">
        <Link href="/favorites" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          View favorites{favorites.length > 0 ? ` (${favorites.length})` : ""}
        </Link>
      </p>
      {editingFile && (
        <ImageEditorDialog
          file={editingFile}
          onCancel={() => setEditingFile(null)}
          onConfirm={uploadEditedImage}
        />
      )}
    </div>
  )
}