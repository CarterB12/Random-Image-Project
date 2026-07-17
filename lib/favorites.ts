export type FavoriteImage = {
  url: string
  name: string
  sourceName: string
  credit?: string
  savedAt: number
}

const STORAGE_KEY = "favorites-v1"

export function readFavorites(): FavoriteImage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FavoriteImage[]) : []
  } catch {
    return []
  }
}

export function writeFavorites(favorites: FavoriteImage[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}
