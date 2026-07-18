"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Download,
  Expand,
  Heart,
  Loader2,
  Pause,
  Play,
  Search,
  Shrink,
  Shuffle,
  SlidersHorizontal,
  Undo2,
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

type UploadedImage = { url: string; name: string; uploader?: string; tags?: string[] }

type Candidate = {
  isUpload: boolean
  sourceIndex: number
  seed: number
  url: string
  credit: string
}

const SEARCH_SOURCES = [
  { name: "Pexels", endpoint: "/api/search-pexels" },
  { name: "Unsplash", endpoint: "/api/search-unsplash" },
  { name: "Pixabay", endpoint: "/api/search-pixabay" },
]

const RECENT_HISTORY_SIZE = 16
const MAX_SHUFFLE_ATTEMPTS = 6
const SWIPE_THRESHOLD = 100
const SWIPE_EXIT_DISTANCE = 600
const SWIPE_EXIT_DURATION = 220
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
  const [editingFileKey, setEditingFileKey] = useState(0)
  const [fileQueue, setFileQueue] = useState<File[]>([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [dynamicUrl, setDynamicUrl] = useState("")
  const [credit, setCredit] = useState("")
  const [loadId, setLoadId] = useState(0)
  const [fillFrame, setFillFrame] = useState(true)
  const frameRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
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
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastSwipe, setLastSwipe] = useState<{
    snapshot: {
      seed: number
      sourceIndex: number
      activeUploadUrl: string | null
      dynamicUrl: string
      credit: string
      searchProvider: string
    }
    likedUrl: string | null
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadsRef = useRef<UploadedImage[]>([])
  const recentHistoryRef = useRef<string[]>([])
  const enabledSourcesRef = useRef<string[]>(ALL_CATEGORY_NAMES)
  const searchQueryRef = useRef("")
  const dragStartRef = useRef({ x: 0, active: false })
  const queuedCandidateRef = useRef<Candidate | null>(null)

  useEffect(() => {
    uploadsRef.current = uploads
    // A newly added/removed upload can change what the pool should offer,
    // so a candidate queued before this change is no longer trustworthy.
    queuedCandidateRef.current = null
  }, [uploads])

  useEffect(() => {
    setFavorites(readFavorites())
    setEnabledSources(readEnabledSources())
  }, [])

  useEffect(() => {
    enabledSourcesRef.current = enabledSources
    queuedCandidateRef.current = null
  }, [enabledSources])

  useEffect(() => {
    searchQueryRef.current = searchQuery
    queuedCandidateRef.current = null
  }, [searchQuery])

  const computeFit = useCallback(() => {
    const frame = frameRef.current
    const img = imgRef.current
    if (!frame || !img || !img.naturalWidth || !img.naturalHeight) return
    const frameAspect = frame.clientWidth / frame.clientHeight
    const imageAspect = img.naturalWidth / img.naturalHeight
    const mismatch = Math.max(frameAspect, imageAspect) / Math.min(frameAspect, imageAspect)
    setFillFrame(mismatch <= 1.35)
  }, [])

  useEffect(() => {
    computeFit()
  }, [computeFit, isFullscreen])

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
      ? `Community upload: ${activeUpload.name.replace(/\.[^.]+$/, "")}`
      : source.name
  const displayCredit = credit || activeUpload?.uploader || ""
  const isFavorited = favorites.some((f) => f.url === url)

  // Picks a candidate without touching component state, so it can run either
  // synchronously (shuffle has nothing queued yet) or ahead of time in the
  // background (prepareNext), reading only refs that are safe from either.
  const selectCandidate = useCallback(async (): Promise<Candidate | null> => {
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
    if (poolSize === 0) return null
    // Cap how much of the pool counts as "recently shown" so a small pool
    // (e.g. few community uploads) doesn't get entirely blocked out.
    const effectiveHistorySize = Math.max(1, Math.min(RECENT_HISTORY_SIZE, Math.floor(poolSize / 2)))
    const recentHistory = recentHistoryRef.current.slice(-effectiveHistorySize)

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

        if (url && recentHistory.includes(url) && attempt < MAX_SHUFFLE_ATTEMPTS - 1) {
          continue
        }

        return { isUpload: false, sourceIndex: sourceIdx, seed: newSeed, url, credit: creditName }
      } else {
        const candidate = currentUploads[pick - effectiveSourceIndices.length]

        if (recentHistory.includes(candidate.url) && attempt < MAX_SHUFFLE_ATTEMPTS - 1) {
          continue
        }

        return { isUpload: true, sourceIndex: 0, seed: 0, url: candidate.url, credit: "" }
      }
    }

    return null
  }, [])

  const applyCandidate = useCallback((candidate: Candidate) => {
    if (candidate.isUpload) {
      setActiveUploadUrl(candidate.url)
      setCredit("")
    } else {
      setActiveUploadUrl(null)
      setSourceIndex(candidate.sourceIndex)
      setSeed(candidate.seed)
      if (SOURCES[candidate.sourceIndex].dynamic) {
        setDynamicUrl(candidate.url)
      }
      setCredit(candidate.credit)
    }
    recentHistoryRef.current = [...recentHistoryRef.current, candidate.url].slice(-RECENT_HISTORY_SIZE)
  }, [])

  // Best-effort: precompute and warm the browser cache for whichever image
  // the *next* shuffle will show, so it can display instantly instead of
  // waiting on a network fetch. Never touches component state.
  const prepareNext = useCallback(async () => {
    if (searchQueryRef.current) return
    const candidate = await selectCandidate()
    if (!candidate) return
    queuedCandidateRef.current = candidate
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = candidate.url
  }, [selectCandidate])

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

    const queued = queuedCandidateRef.current
    queuedCandidateRef.current = null
    const candidate = queued ?? (await selectCandidate())
    if (candidate) applyCandidate(candidate)

    prepareNext()
  }, [selectCandidate, applyCandidate, prepareNext])

  const manualShuffle = useCallback(() => {
    setLastSwipe({
      snapshot: { seed, sourceIndex, activeUploadUrl, dynamicUrl, credit, searchProvider },
      likedUrl: null,
    })
    shuffle()
  }, [seed, sourceIndex, activeUploadUrl, dynamicUrl, credit, searchProvider, shuffle])

  const performSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = searchInput.trim()
      if (!trimmed) return
      searchQueryRef.current = trimmed
      setSearchQuery(trimmed)
      recentHistoryRef.current = []
      setLastSwipe(null)
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
    setLastSwipe(null)
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
    const interval = setInterval(manualShuffle, 4000)
    return () => clearInterval(interval)
  }, [slideshow, manualShuffle])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return
      if (editingFile) return
      e.preventDefault()
      manualShuffle()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [manualShuffle, editingFile])

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return
    setQueueTotal(files.length)
    setFileQueue(files.slice(1))
    setEditingFile(files[0])
    setEditingFileKey((k) => k + 1)
  }, [])

  const advanceQueue = useCallback(() => {
    setFileQueue((prev) => {
      if (prev.length === 0) {
        setEditingFile(null)
        setQueueTotal(0)
        return prev
      }
      const [next, ...rest] = prev
      setEditingFile(next)
      setEditingFileKey((k) => k + 1)
      return rest
    })
  }, [])

  const uploadEditedImage = useCallback(async (blob: Blob, fileName: string, uploaderName: string, tags: string) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", blob, fileName)
      formData.append("uploader", uploaderName)
      formData.append("tags", tags)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const newImage: UploadedImage = {
        url: data.url,
        name: data.name ?? fileName,
        uploader: data.uploader,
        tags: data.tags,
      }
      setUploads((prev) => [...prev, newImage])
      setActiveUploadUrl(newImage.url)
      setCredit("")
      setLastSwipe(null)
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
              credit: displayCredit || undefined,
              savedAt: Date.now(),
            },
          ]
      writeFavorites(next)
      return next
    })
  }, [url, fileName, sourceName, displayCredit])

  const addFavoriteCurrent = useCallback(() => {
    setFavorites((prev) => {
      if (prev.some((f) => f.url === url)) return prev
      const next = [
        ...prev,
        { url, name: fileName, sourceName, credit: displayCredit || undefined, savedAt: Date.now() },
      ]
      writeFavorites(next)
      return next
    })
  }, [url, fileName, sourceName, displayCredit])

  const triggerSwipe = useCallback(
    (direction: "left" | "right") => {
      if (exitDirection || loading) return
      setLastSwipe({
        snapshot: { seed, sourceIndex, activeUploadUrl, dynamicUrl, credit, searchProvider },
        likedUrl: direction === "right" ? url : null,
      })
      if (direction === "right") addFavoriteCurrent()
      setIsDragging(false)
      setExitDirection(direction)
      setDragX(direction === "right" ? SWIPE_EXIT_DISTANCE : -SWIPE_EXIT_DISTANCE)
      window.setTimeout(() => {
        shuffle()
        setExitDirection(null)
        setDragX(0)
      }, SWIPE_EXIT_DURATION)
    },
    [
      exitDirection,
      loading,
      addFavoriteCurrent,
      shuffle,
      seed,
      sourceIndex,
      activeUploadUrl,
      dynamicUrl,
      credit,
      searchProvider,
      url,
    ],
  )

  const undoSwipe = useCallback(() => {
    if (!lastSwipe) return
    const { snapshot, likedUrl } = lastSwipe
    setSeed(snapshot.seed)
    setSourceIndex(snapshot.sourceIndex)
    setActiveUploadUrl(snapshot.activeUploadUrl)
    setDynamicUrl(snapshot.dynamicUrl)
    setCredit(snapshot.credit)
    setSearchProvider(snapshot.searchProvider)
    if (likedUrl) {
      setFavorites((prev) => {
        const next = prev.filter((f) => f.url !== likedUrl)
        writeFavorites(next)
        return next
      })
    }
    setLoading(true)
    setLoadId((n) => n + 1)
    setLastSwipe(null)
  }, [lastSwipe])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (exitDirection || loading) return
      dragStartRef.current = { x: e.clientX, active: true }
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [exitDirection, loading],
  )

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current.active) return
    setDragX(e.clientX - dragStartRef.current.x)
  }, [])

  const endDrag = useCallback(() => {
    if (!dragStartRef.current.active) return
    dragStartRef.current.active = false
    setIsDragging(false)
    setDragX((current) => {
      if (Math.abs(current) > SWIPE_THRESHOLD) {
        triggerSwipe(current > 0 ? "right" : "left")
        return current
      }
      return 0
    })
  }, [triggerSwipe])

  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return
      if (editingFile) return
      e.preventDefault()
      triggerSwipe(e.key === "ArrowRight" ? "right" : "left")
    }
    window.addEventListener("keydown", handleArrowKeys)
    return () => window.removeEventListener("keydown", handleArrowKeys)
  }, [triggerSwipe, editingFile])

  useEffect(() => {
    if (!isFullscreen) return
    document.body.style.overflow = "hidden"
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isFullscreen])

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
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-black"
            : "overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        }
      >
        <div
          ref={frameRef}
          className={`relative flex touch-none select-none items-center justify-center overflow-hidden ${
            isFullscreen ? "h-full w-full" : "aspect-[3/2] bg-muted"
          }`}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
            transition: isDragging ? "none" : "transform 220ms ease",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading image</span>
            </div>
          )}
          {(dragX > 20 || exitDirection === "right") && (
            <div
              className="absolute right-4 top-4 z-20 rotate-6 rounded-lg border-2 border-emerald-500 px-3 py-1 text-sm font-bold text-emerald-500"
              style={{ opacity: exitDirection ? 1 : Math.min(dragX / SWIPE_THRESHOLD, 1) }}
            >
              LIKE
            </div>
          )}
          {(dragX < -20 || exitDirection === "left") && (
            <div
              className="absolute left-4 top-4 z-20 -rotate-6 rounded-lg border-2 border-rose-500 px-3 py-1 text-sm font-bold text-rose-500"
              style={{ opacity: exitDirection ? 1 : Math.min(-dragX / SWIPE_THRESHOLD, 1) }}
            >
              SKIP
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={loadId}
            ref={imgRef}
            src={url || "/placeholder.svg"}
            alt="Random image"
            className={`h-full w-full ${fillFrame ? "object-cover" : "object-contain"}`}
            onLoad={() => {
              setLoading(false)
              computeFit()
            }}
            onError={() => setLoading(false)}
            crossOrigin="anonymous"
            draggable={false}
          />
          {isFullscreen && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Exit fullscreen"
              title="Exit fullscreen"
              className="absolute right-4 top-4 z-20"
            >
              <Shrink className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        {!isFullscreen && (
        <div className="flex flex-col gap-2 p-4">
          <Button onClick={manualShuffle}>
            <Shuffle className="size-4" aria-hidden="true" />
            Shuffle
          </Button>
          <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={undoSwipe}
            disabled={!lastSwipe}
            aria-label="Undo last swipe"
            title="Undo last swipe"
          >
            <Undo2 className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsFullscreen(true)}
            aria-label="View fullscreen"
            title="View fullscreen"
          >
            <Expand className="size-4" aria-hidden="true" />
          </Button>
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
            multiple
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
        )}
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
        Current source: {sourceName}.{displayCredit && ` Photo by ${displayCredit}.`}
      </p>
      <p className="mt-1 text-center text-xs">
        <Link href="/favorites" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          View favorites{favorites.length > 0 ? ` (${favorites.length})` : ""}
        </Link>
        <span className="mx-2 text-muted-foreground">·</span>
        <Link href="/gallery" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Community gallery
        </Link>
      </p>
      {editingFile && (
        <ImageEditorDialog
          key={editingFileKey}
          file={editingFile}
          queuePosition={queueTotal - fileQueue.length}
          queueTotal={queueTotal}
          onCancel={advanceQueue}
          onConfirm={(blob, name, uploaderName, tags) => {
            uploadEditedImage(blob, name, uploaderName, tags)
            advanceQueue()
          }}
        />
      )}
    </div>
  )
}