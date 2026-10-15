"use client";

/* eslint-disable @next/next/no-img-element -- photos are served from our own API at their stored size */

import { useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * A unit's photos as a swipeable strip with a counter and thumbnails. Scrolling
 * is native (scroll-snap), so touch and trackpad work without extra code.
 */
export function PhotoCarousel({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = (next: number) => {
    const element = scroller.current;
    if (!element) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    element.scrollTo({
      left: clamped * element.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-w-0">
      <div className="relative overflow-hidden rounded-2xl">
        <div
          ref={scroller}
          onScroll={(event) => {
            const element = event.currentTarget;
            setIndex(Math.round(element.scrollLeft / element.clientWidth));
          }}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.length ? (
            photos.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={i === 0 ? `${alt} cover photo` : `${alt} photo ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                className="aspect-[4/3] w-full shrink-0 snap-center object-cover"
              />
            ))
          ) : (
            <div
              role="img"
              aria-label={`${alt} has no photos yet`}
              className="aspect-[4/3] w-full shrink-0 bg-gradient-to-br from-sage via-pine-mist to-sand"
            />
          )}
        </div>
        {photos.length > 1 ? (
          <>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold text-white tabular-nums">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-pine shadow-md hover:bg-paper disabled:opacity-0 sm:flex"
            >
              <CaretLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === photos.length - 1}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-pine shadow-md hover:bg-paper disabled:opacity-0 sm:flex"
            >
              <CaretRight className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      {photos.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 transition",
                i === index
                  ? "ring-pine"
                  : "opacity-70 ring-transparent hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
