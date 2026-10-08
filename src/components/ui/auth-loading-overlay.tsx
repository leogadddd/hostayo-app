"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import greenLoader from "@/assets/hostayo-loader-green.gif";
import whiteLoader from "@/assets/hostayo-loader-white.gif";

export function AuthLoadingOverlay({
  label,
  tone = "light",
}: {
  label: string;
  tone?: "light" | "dark";
}) {
  const [visible, setVisible] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Avoid a distracting flash when authentication resolves immediately.
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    // A modal <dialog> sits in the top layer, which no z-index can outrank. Open
    // this one as a modal too so it stacks above any dialog that triggered it
    // (the sign-out confirmation), since later top-layer entries render last.
    const element = dialog.current;
    if (visible && element && !element.open) element.showModal();
  }, [visible]);

  if (!visible) return null;
  const dark = tone === "dark";
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => event.preventDefault()}
      className={`animate-fade-in fixed inset-0 z-[100] m-0 h-dvh max-h-none w-dvw max-w-none items-center justify-center border-0 px-6 open:flex ${dark ? "theme-keep-light bg-pine-deep/95 text-paper" : "bg-paper/95 text-pine"}`}
      aria-label={label}
    >
      <div className="flex flex-col items-center text-center">
        <Image
          src={dark ? whiteLoader : greenLoader}
          alt=""
          width={112}
          height={112}
          unoptimized
          priority
          className={dark ? undefined : "dark:hidden"}
        />
        {dark ? null : (
          <Image
            src={whiteLoader}
            alt=""
            width={112}
            height={112}
            unoptimized
            className="hidden dark:block"
          />
        )}
        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-sm font-medium"
        >
          {label}
        </p>
      </div>
    </dialog>
  );
}
