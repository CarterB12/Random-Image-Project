export function parseUploadPathname(pathname: string): { name: string; uploader: string } {
  const parts = pathname.split("/")
  if (parts.length >= 4) {
    return { uploader: parts[2], name: parts[3] }
  }
  // Fallback for uploads made before uploader names were tracked.
  return { uploader: "", name: pathname.replace(/^uploads\/\d+-/, "") }
}
