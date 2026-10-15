"use client";

/**
 * A full-page photo preview you can open from anywhere.
 *
 *   const viewer = usePhotoViewer(photos);
 *   <button onClick={() => viewer.open(2)}>…</button>
 *   {viewer.element}
 *
 * `photos` is the list the viewer plays through, laid out as one horizontal
 * scroll-snap strip. Swiping is the browser's own scrolling, so the photo
 * follows your finger, flicks carry momentum and it settles on a photo with no
 * jump. A thumbnail "playlist" along the bottom jumps to any photo; arrows and
 * the keyboard (← → Esc) work too, and on phones the arrows give way to
 * swiping. Dragging down closes it. The close button and Esc return focus to
 * whatever opened it.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
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
  const strip = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const indexRef = useRef(index);
  // The photo a programmatic scroll is heading to; scroll events on the way
  // there must not be mistaken for the viewer's own swipes.
  const settling = useRef<number | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(
    null,
  );
  const count = photos.length;
  const photo = photos[index];

  const scrollToIndex = useCallback((to: number, smooth: boolean) => {
    const element = strip.current;
    if (!element) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    element.scrollTo({
      left: to * element.clientWidth,
      behavior: smooth && !reduced ? "smooth" : "auto",
    });
  }, []);

  const go = useCallback(
    (delta: number) => {
      const target = Math.max(0, Math.min(count - 1, index + delta));
      if (target !== index) onIndexChange(target);
    },
    [count, index, onIndexChange],
  );

  // Event handlers read the latest index from here.
  useLayoutEffect(() => {
    indexRef.current = index;
  });

  // Open on the chosen photo without scrolling there, and stay on it if the
  // window is resized or the phone is turned.
  useLayoutEffect(() => {
    scrollToIndex(indexRef.current, false);
    const onResize = () => scrollToIndex(indexRef.current, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [scrollToIndex]);

  // A thumbnail, arrow or key moved the index: scroll the strip to match. One
  // photo away glides; further away it jumps, so a long animation never has
  // to be waited out. Until the strip arrives, its own scroll events must not
  // be read as the viewer swiping somewhere else.
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const from = Math.round(element.scrollLeft / element.clientWidth);
    if (from === index) return;
    settling.current = index;
    scrollToIndex(index, Math.abs(index - from) === 1);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      settling.current = null;
    }, 2000);
    return () => window.clearTimeout(settleTimer.current);
  }, [index, scrollToIndex]);

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

  const resetStage = (animate: boolean) => {
    const element = stage.current;
    if (!element) return;
    element.style.transition = animate
      ? "transform 0.2s ease, opacity 0.2s ease"
      : "none";
    element.style.transform = "";
    element.style.opacity = "";
  };

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
        ref={stage}
        className="relative min-h-0 flex-1 will-change-transform"
        onTouchStart={(event) => {
          // Leave pinch-zoomed pages and two-finger gestures to the browser.
          const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
          if (event.touches.length !== 1 || zoomed) {
            drag.current = null;
            return;
          }
          const touch = event.touches[0]!;
          drag.current = { x: touch.clientX, y: touch.clientY, axis: null };
          resetStage(false);
        }}
        onTouchMove={(event) => {
          const state = drag.current;
          const element = stage.current;
          if (!state || !element) return;
          if (event.touches.length !== 1) {
            drag.current = null;
            resetStage(false);
            return;
          }
          const touch = event.touches[0]!;
          const dx = touch.clientX - state.x;
          const dy = touch.clientY - state.y;
          if (!state.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
            state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          }
          // Sideways is the browser's own scrolling. Only a downward drag is
          // ours: the stage follows the finger and fades, then closes.
          if (state.axis === "y" && dy > 0) {
            element.style.transform = `translateY(${dy}px)`;
            element.style.opacity = String(Math.max(0.4, 1 - dy / 400));
          }
        }}
        onTouchEnd={(event) => {
          const state = drag.current;
          drag.current = null;
          resetStage(true);
          const touch = event.changedTouches[0];
          if (!state || !touch) return;
          if (state.axis === "y" && touch.clientY - state.y > 110) onClose();
        }}
        onTouchCancel={() => {
          drag.current = null;
          resetStage(true);
        }}
      >
        {count > 1 ? (
          <>
            <NavButton
              side="left"
              label="Previous photo"
              disabled={index === 0}
              onClick={() => go(-1)}
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </NavButton>
            <NavButton
              side="right"
              label="Next photo"
              disabled={index === count - 1}
              onClick={() => go(1)}
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </NavButton>
          </>
        ) : null}
        <div
          ref={strip}
          onTouchStart={() => {
            settling.current = null;
          }}
          onWheel={() => {
            settling.current = null;
          }}
          onScroll={(event) => {
            const element = event.currentTarget;
            const at = Math.round(element.scrollLeft / element.clientWidth);
            if (settling.current !== null) {
              if (at !== settling.current) return;
              settling.current = null;
            }
            if (at !== indexRef.current) onIndexChange(at);
          }}
          className="flex h-full w-full touch-pan-x touch-pinch-zoom snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((item, i) => (
            <div
              key={item.id}
              onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
              }}
              className="flex h-full w-full shrink-0 snap-center snap-always items-center justify-center sm:px-16"
            >
              {/* Plain img: these are authenticated, already-optimized files. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.alt ?? item.caption ?? item.label ?? "Photo"}
                loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                decoding="async"
                className="max-h-full max-w-full object-contain shadow-2xl sm:rounded-lg"
                draggable={false}
              />
            </div>
          ))}
        </div>
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
  disabled,
  children,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition-colors disabled:invisible sm:grid hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
        side === "left" ? "left-2 sm:left-4" : "right-2 sm:right-4",
      )}
    >
      {children}
    </button>
  );
}

/**
 * A scrolling strip of thumbnails: the "playlist" of a photo list. Used at the
 * bottom of the viewer, and reusable on its own wherever photos are listed.
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
