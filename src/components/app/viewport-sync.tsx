"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DESKTOP_MIN_WIDTH,
  VIEWPORT_COOKIE,
  type DeviceClass,
} from "@/lib/viewport";

/**
 * Tells the server which layout the window actually needs. When that differs
 * from what the server rendered (a first visit it guessed wrong, a rotated
 * tablet, a resized desktop window) the cookie is updated and the page
 * re-renders in the right layout.
 */
export function ViewportSync({ rendered }: { rendered: DeviceClass }) {
  const router = useRouter();
  const known = useRef(rendered);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const sync = () => {
      const next: DeviceClass = query.matches ? "desktop" : "mobile";
      document.cookie = `${VIEWPORT_COOKIE}=${next}; path=/; samesite=lax`;
      if (next !== known.current) {
        known.current = next;
        router.refresh();
      }
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [router]);

  return null;
}
