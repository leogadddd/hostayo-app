"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import greenLoader from "@/assets/hostayo-loader-green.gif";
import whiteLoader from "@/assets/hostayo-loader-white.gif";

/**
 * Avoids an App Router development-mode bug where a server-component redirect
 * is recorded as an aborted render with a negative performance timestamp.
 */
export function HomeRedirect({
  href,
}: {
  href: "/login" | "/onboarding" | "/dashboard";
}) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return (
    <main
      className="grid min-h-screen place-items-center px-6"
      role="status"
      aria-live="polite"
    >
      <div className="animate-fade-in flex flex-col items-center text-center">
        {/* Same loader as sign-in: green on light, white on dark. */}
        <Image
          src={greenLoader}
          alt=""
          width={112}
          height={112}
          unoptimized
          priority
          className="dark:hidden"
        />
        <Image
          src={whiteLoader}
          alt=""
          width={112}
          height={112}
          unoptimized
          className="hidden dark:block"
        />
        <p className="mt-4 text-sm font-medium text-pine">Opening Hostayo…</p>
      </div>
    </main>
  );
}
