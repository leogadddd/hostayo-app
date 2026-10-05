"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** One-time recovery codes with copy and download; shown once after setup or regeneration. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const text = `Hostayo recovery codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "hostayo-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <ol className="grid grid-cols-2 gap-2 rounded-xl border border-pine/10 bg-paper p-4 font-mono text-sm text-pine">
        {codes.map((code, index) => (
          <li
            key={code}
            className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2"
          >
            <span className="w-4 text-right text-xs text-ink/35">
              {index + 1}
            </span>
            <span className="tracking-wide">{code}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy codes"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download className="h-4 w-4" aria-hidden />
          Download .txt
        </Button>
        <span className="sr-only" role="status">
          {copied ? "Recovery codes copied." : ""}
        </span>
      </div>
    </div>
  );
}
