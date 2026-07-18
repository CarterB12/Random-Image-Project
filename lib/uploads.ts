export function parseUploadPathname(pathname: string): { name: string; uploader: string; tags: string[] } {
  const parts = pathname.split("/")
  if (parts.length >= 5) {
    return { uploader: parts[2], tags: parts[3] ? parts[3].split(",").filter(Boolean) : [], name: parts[4] }
  }
  if (parts.length === 4) {
    return { uploader: parts[2], tags: [], name: parts[3] }
  }
  // Fallback for uploads made before uploader names were tracked.
  return { uploader: "", tags: [], name: pathname.replace(/^uploads\/\d+-/, "") }
}

export function sanitizeTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, ""))
        .filter(Boolean),
    ),
  ).slice(0, 6)
}
