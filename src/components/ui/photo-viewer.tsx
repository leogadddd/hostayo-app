"use client";

/**
 * A full-page photo preview you can open from anywhere.
 *
 *   const viewer = usePhotoViewer(photos);
 *   <button onClick={() => viewer.open(2)}>…</button>
 *   {viewer.element}
 *
 * `photos` is the list the viewer plays through. A thumbnail "playlist" runs
 * along the top so people can jump to any photo, with previous/next arrows,
 * keyboard (← → Esc), and swipe on touch screens. The close button and Esc
 * return focus to whatever opened it.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  X,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface ViewerPhoto {
  id: string;
  src: string;
  /** Short description for screen readers; falls back to the caption. */
  alt?: string;
  caption?: string | null;
  /** A small tag shown over the photo, such as its section. */
  label?: string;
}

export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  title,
}: {
  photos: ViewerPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Names the dialog, e.g. the unit or property. */
  title?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeThumb = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);
  const count = photos.length;
  const photo = photos[index];

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "Tab") {
        // Keep focus inside the dialog.
        const root = closeRef.current?.closest("[role=dialog]");
        const focusable = root?.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        );
        if (!focusable?.length) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Keep the current thumbnail in view in the playlist.
  useEffect(() => {
    activeThumb.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [index]);

  if (!photo) return null;
  const next = photos[(index + 1) % count];
  const previous = photos[(index - 1 + count) % count];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex flex-col bg-[#0f1c19]/[0.98] text-white backdrop-blur-sm"
    >
      <header className="flex items-center gap-3 px-4 pb-2 pt-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p id={titleId} className="truncate text-sm font-medium">
            {title ?? "Photos"}
          </p>
          <p className="text-xs text-white/60" aria-live="polite">
            {index + 1} of {count}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close photo preview"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {count > 1 ? (
        <PhotoPlaylist
          photos={photos}
          index={index}
          onSelect={onIndexChange}
          activeRef={activeThumb}
          className="px-4 pb-3 sm:px-6"
          tone="dark"
        />
      ) : null}

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          const end = event.changedTouches[0]?.clientX;
          if (start === null || end === undefined) return;
          if (Math.abs(end - start) > 50) go(end < start ? 1 : -1);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {count > 1 ? (
          <>
            <NavButton
              side="left"
              label="Previous photo"
              onClick={() => go(-1)}
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </NavButton>
            <NavButton side="right" label="Next photo" onClick={() => go(1)}>
              <ChevronRight className="h-6 w-6" aria-hidden />
            </NavButton>
          </>
        ) : null}
        {/* Plain img: these are authenticated, already-optimized files. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.src}
          alt={photo.alt ?? photo.caption ?? photo.label ?? "Photo"}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          draggable={false}
        />
        {/* Warm the neighbours so arrows feel instant. */}
        {count > 1 ? (
          <div className="hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={next!.src} alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previous!.src} alt="" />
          </div>
        ) : null}
      </div>

      <footer className="flex min-h-16 flex-col items-center justify-center gap-1 px-4 py-3 text-center">
        {photo.label ? (
          <span className="rounded-full bg-white/12 px-3 py-0.5 text-xs font-medium">
            {photo.label}
          </span>
        ) : null}
        {photo.caption ? (
          <p className="max-w-2xl text-sm text-white/85">{photo.caption}</p>
        ) : null}
      </footer>
    </div>,
    document.body,
  );
}

function NavButton({
  side,
  label,
  onClick,
  children,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
        side === "left" ? "left-2 sm:left-4" : "right-2 sm:right-4",
      )}
    >
      {children}
    </button>
  );
}

/**
 * A scrolling strip of thumbnails: the "playlist" of a photo list. Used at the
 * top of the viewer, and reusable on its own wherever photos are listed.
 */
export function PhotoPlaylist({
  photos,
  index,
  onSelect,
  activeRef,
  className,
  tone = "light",
}: {
  photos: ViewerPhoto[];
  /** The highlighted photo, if any. */
  index?: number;
  onSelect: (index: number) => void;
  activeRef?: React.Ref<HTMLButtonElement>;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      role="list"
      aria-label="Photos"
      className={cn(
        "flex gap-2 overflow-x-auto [scrollbar-width:thin]",
        className,
      )}
    >
      {photos.map((photo, i) => {
        const active = i === index;
        return (
          <button
            key={photo.id}
            ref={active ? activeRef : undefined}
            role="listitem"
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Show photo ${i + 1}${photo.label ? `, ${photo.label}` : ""}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-offset-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay",
              tone === "dark" ? "ring-offset-[#0f1c19]" : "ring-offset-surface",
              active
                ? "opacity-100 ring-2 ring-clay"
                : "opacity-60 hover:opacity-100",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </button>
        );
      })}
    </div>
  );
}

/** State for opening a viewer on a list of photos. Render `element` once. */
export function usePhotoViewer(photos: ViewerPhoto[], title?: string) {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);
  const open = useCallback((at = 0) => setIndex(at), []);
  const element =
    index !== null && photos.length > 0 ? (
      <PhotoViewer
        photos={photos}
        index={Math.min(index, photos.length - 1)}
        onIndexChange={setIndex}
        onClose={close}
        title={title}
      />
    ) : null;
  return { open, close, isOpen: index !== null, element };
}
