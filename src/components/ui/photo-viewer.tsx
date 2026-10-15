"use client";

/**
 * A full-page photo preview you can open from anywhere.
 *
 *   const viewer = usePhotoViewer(photos);
 *   <button onClick={() => viewer.open(2)}>…</button>
 *   {viewer.element}
 *
 * `photos` is the list the viewer plays through. A thumbnail "playlist" runs
 * along the bottom so people can jump to any photo, with previous/next arrows,
 * keyboard (← → Esc), and touch gestures: the photo follows your finger, a
 * sideways swipe browses and a swipe down closes. The playlist sits along the
 * bottom, and on phones the arrows give way to swiping. The close button and Esc
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
  const imageRef = useRef<HTMLImageElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    axis: "x" | "y" | null;
  } | null>(null);
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
      className="fixed inset-0 z-[100] flex h-dvh flex-col overscroll-contain bg-black pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white"
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
          className="order-last px-4 pb-3 pt-1 sm:px-6"
          tone="dark"
        />
      ) : null}

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden px-0 sm:px-16"
        onTouchStart={(event) => {
          // Leave pinch-zoomed pages and two-finger gestures to the browser.
          const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
          if (event.touches.length !== 1 || zoomed) {
            gesture.current = null;
            return;
          }
          const touch = event.touches[0]!;
          gesture.current = { x: touch.clientX, y: touch.clientY, axis: null };
          if (imageRef.current) imageRef.current.style.transition = "none";
        }}
        onTouchMove={(event) => {
          const state = gesture.current;
          const image = imageRef.current;
          if (!state || !image) return;
          if (event.touches.length !== 1) {
            gesture.current = null;
            image.style.transform = "";
            return;
          }
          const touch = event.touches[0]!;
          const dx = touch.clientX - state.x;
          const dy = touch.clientY - state.y;
          if (!state.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
            state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          }
          // The photo follows the finger: sideways to browse, down to dismiss.
          if (state.axis === "x") {
            image.style.transform = `translateX(${dx}px)`;
          } else if (state.axis === "y" && dy > 0) {
            image.style.transform = `translateY(${dy}px)`;
            image.style.opacity = String(Math.max(0.4, 1 - dy / 400));
          }
        }}
        onTouchEnd={(event) => {
          const state = gesture.current;
          const image = imageRef.current;
          gesture.current = null;
          if (image) {
            image.style.transition = "transform 0.18s ease, opacity 0.18s ease";
            image.style.transform = "";
            image.style.opacity = "";
          }
          const touch = event.changedTouches[0];
          if (!state || !touch) return;
          const dx = touch.clientX - state.x;
          const dy = touch.clientY - state.y;
          if (state.axis === "x" && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
          else if (state.axis === "y" && dy > 110) onClose();
        }}
        onTouchCancel={() => {
          gesture.current = null;
          if (imageRef.current) {
            imageRef.current.style.transform = "";
            imageRef.current.style.opacity = "";
          }
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
          ref={imageRef}
          key={photo.id}
          src={photo.src}
          alt={photo.alt ?? photo.caption ?? photo.label ?? "Photo"}
          decoding="async"
          className="max-h-full max-w-full rounded-none object-contain shadow-2xl will-change-transform sm:rounded-lg"
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

      <footer
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-4 text-center sm:min-h-16 sm:py-3",
          photo.label || photo.caption ? "py-2" : "py-0",
        )}
      >
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
        "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full sm:grid bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
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
              "relative h-12 w-16 shrink-0 overflow-hidden rounded-lg ring-offset-2 sm:h-14 sm:w-20 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay",
              tone === "dark" ? "ring-offset-black" : "ring-offset-surface",
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
