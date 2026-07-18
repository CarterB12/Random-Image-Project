"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, RotateCcw, RotateCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const PREVIEW_SIZE = 300
const ASPECT = 3 / 2
const MIN_CROP_SIZE = 60

type CropRect = { x: number; y: number; w: number; h: number }

type Props = {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob, fileName: string) => void
}

export function ImageEditorDialog({ file, onCancel, onConfirm }: Props) {
  const [imageUrl] = useState(() => URL.createObjectURL(file))
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 })
  const [submitting, setSubmitting] = useState(false)
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; startCrop: CropRect } | null>(
    null,
  )

  const handleCancel = useCallback(() => {
    URL.revokeObjectURL(imageUrl)
    onCancel()
  }, [imageUrl, onCancel])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
  }, [])

  const rotatedW = naturalSize ? (rotation % 180 === 0 ? naturalSize.w : naturalSize.h) : 0
  const rotatedH = naturalSize ? (rotation % 180 === 0 ? naturalSize.h : naturalSize.w) : 0
  const containScale = naturalSize ? Math.min(PREVIEW_SIZE / rotatedW, PREVIEW_SIZE / rotatedH) : 0
  const displayW = rotatedW * containScale
  const displayH = rotatedH * containScale
  const imgDisplayW = naturalSize ? naturalSize.w * containScale : 0
  const imgDisplayH = naturalSize ? naturalSize.h * containScale : 0

  // (Re)initialize the crop rect whenever the displayed (rotated) size changes.
  useEffect(() => {
    if (!displayW || !displayH) return
    let w = displayW
    let h = w / ASPECT
    if (h > displayH) {
      h = displayH
      w = h * ASPECT
    }
    setCrop({ x: (displayW - w) / 2, y: (displayH - h) / 2, w, h })
  }, [displayW, displayH])

  const clampCrop = useCallback(
    (next: CropRect): CropRect => {
      let { x, y, w, h } = next
      w = Math.max(MIN_CROP_SIZE, Math.min(w, displayW))
      h = w / ASPECT
      if (h > displayH) {
        h = displayH
        w = h * ASPECT
      }
      x = Math.min(Math.max(x, 0), displayW - w)
      y = Math.min(Math.max(y, 0), displayH - h)
      return { x, y, w, h }
    },
    [displayW, displayH],
  )

  const onRectPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      dragRef.current = { mode: "move", startX: e.clientX, startY: e.clientY, startCrop: crop }
    },
    [crop],
  )

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      dragRef.current = { mode: "resize", startX: e.clientX, startY: e.clientY, startCrop: crop }
    },
    [crop],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY

      if (drag.mode === "move") {
        setCrop(clampCrop({ ...drag.startCrop, x: drag.startCrop.x + dx, y: drag.startCrop.y + dy }))
      } else {
        const delta = Math.max(dx, dy)
        setCrop(
          clampCrop({
            ...drag.startCrop,
            w: drag.startCrop.w + delta,
            h: (drag.startCrop.w + delta) / ASPECT,
          }),
        )
      }
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [clampCrop])

  const handleConfirm = useCallback(async () => {
    if (!naturalSize) return
    setSubmitting(true)
    try {
      const img = new Image()
      img.src = imageUrl
      if (!img.complete) {
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
      }

      const rotatedCanvas = document.createElement("canvas")
      rotatedCanvas.width = rotatedW
      rotatedCanvas.height = rotatedH
      const rctx = rotatedCanvas.getContext("2d")!
      rctx.translate(rotatedW / 2, rotatedH / 2)
      rctx.rotate((rotation * Math.PI) / 180)
      rctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2, naturalSize.w, naturalSize.h)

      const scaleToNatural = 1 / containScale
      const cropX = crop.x * scaleToNatural
      const cropY = crop.y * scaleToNatural
      const cropW = crop.w * scaleToNatural
      const cropH = crop.h * scaleToNatural

      const outCanvas = document.createElement("canvas")
      outCanvas.width = Math.round(cropW)
      outCanvas.height = Math.round(cropH)
      const octx = outCanvas.getContext("2d")!
      octx.drawImage(rotatedCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

      const blob: Blob = await new Promise((resolve, reject) => {
        outCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92)
      })

      const baseName = file.name.replace(/\.[^.]+$/, "")
      URL.revokeObjectURL(imageUrl)
      onConfirm(blob, `${baseName}.jpg`)
    } finally {
      setSubmitting(false)
    }
  }, [naturalSize, rotatedW, rotatedH, rotation, containScale, crop, imageUrl, file.name, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
        <p className="mb-3 text-center text-sm font-medium">Crop &amp; rotate</p>
        <div
          className="relative mx-auto overflow-hidden rounded-lg bg-muted"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        >
          <div className="flex h-full w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Image being edited"
              onLoad={handleImageLoad}
              style={{
                width: imgDisplayW || undefined,
                height: imgDisplayH || undefined,
                transform: `rotate(${rotation}deg)`,
              }}
              className="max-w-none"
            />
          </div>
          {naturalSize && (
            <div
              onPointerDown={onRectPointerDown}
              className="absolute cursor-move border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              style={{
                left: `calc(50% - ${displayW / 2}px + ${crop.x}px)`,
                top: `calc(50% - ${displayH / 2}px + ${crop.y}px)`,
                width: crop.w,
                height: crop.h,
              }}
            >
              <div
                onPointerDown={onHandlePointerDown}
                className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-full border-2 border-white bg-foreground"
              />
            </div>
          )}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setRotation((r) => (r + 270) % 360)}
            aria-label="Rotate left"
            title="Rotate left"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Rotate right"
            title="Rotate right"
          >
            <RotateCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleCancel} disabled={submitting}>
            <X className="size-4" aria-hidden="true" />
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={submitting || !naturalSize}>
            <Check className="size-4" aria-hidden="true" />
            {submitting ? "Uploading..." : "Apply & Upload"}
          </Button>
        </div>
      </div>
    </div>
  )
}
