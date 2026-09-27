"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Avoids an App Router development-mode bug where a server-component redirect
 * is recorded as an aborted render with a negative performance timestamp.
 */
export function HomeRedirect({ href }: { href: "/login" | "/onboarding" | "/dashboard" }) {
  const router = useRouter();
  useEffect(() => { router.replace(href); }, [href, router]);
  return <main className="grid min-h-screen place-items-center text-sm text-ink/60">Opening StayOps…</main>;
}
