"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** Google Analytics, loaded only once the visitor chose "Accept all". */
export function Analytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(readConsent() === "all");
    sync();
    window.addEventListener("hostayo:cookie-consent", sync);
    return () => window.removeEventListener("hostayo:cookie-consent", sync);
  }, []);

  if (!GA_ID || !allowed) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
