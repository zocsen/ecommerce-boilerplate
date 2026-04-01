"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Product gallery — main image + thumbnail strip                     */
/* ------------------------------------------------------------------ */

interface GalleryProps {
  mainImage: string | null;
  images: string[];
}

export function Gallery({ mainImage, images }: GalleryProps) {
  // Build a deduplicated list: main image first, then extras
  const allImages = buildImageList(mainImage, images);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleThumbnailClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // No images at all — show placeholder
  if (allImages.length === 0) {
    return (
      <div className="w-full rounded-lg bg-muted" style={{ aspectRatio: "4/5" }}>
        <div className="flex h-full items-center justify-center">
          <span className="text-6xl font-light text-muted-foreground/30">?</span>
        </div>
      </div>
    );
  }

  const currentImage = allImages[activeIndex] ?? allImages[0];

  return (
    <div className="space-y-3">
      {/* ── Main image ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-lg bg-muted" style={{ aspectRatio: "4/5" }}>
        <Image
          src={currentImage}
          alt="Termékfotó"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-opacity duration-500 ease-out"
          priority
          unoptimized={currentImage.startsWith("http://")}
        />
      </div>

      {/* ── Thumbnails ──────────────────────────────────── */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                "relative size-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-md bg-muted transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                index === activeIndex
                  ? "ring-2 ring-foreground ring-offset-2"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={src}
                alt={`Termékfotó ${index + 1}`}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={src.startsWith("http://")}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Builds a deduplicated image list with mainImage first. */
function buildImageList(mainImage: string | null, images: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  if (mainImage) {
    result.push(mainImage);
    seen.add(mainImage);
  }

  for (const img of images) {
    if (!seen.has(img)) {
      result.push(img);
      seen.add(img);
    }
  }

  return result;
}
