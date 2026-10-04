"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Share" button for a public page. Opens the native share sheet where there is
 * one, otherwise copies the link. Only the copy path reports success; a
 * cancelled native share stays quiet.
 */
export function SharePublicLink({ href, title, label = "Share", size = "md", className }: { href: string; title: string; label?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("Link copied");
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error("Couldn’t share this link");
    }
  }
  return (
    <Button type="button" variant="outline" size={size} onClick={share} title={`Share ${title}`} aria-label={`${label} ${title}`} className={cn("shrink-0 whitespace-nowrap", className)}>
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      {copied ? "Link copied" : label}
      <span className="sr-only" role="status">{copied ? "Link copied" : ""}</span>
    </Button>
  );
}
