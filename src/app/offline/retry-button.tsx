"use client";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <Button
      type="button"
      variant="clay"
      size="lg"
      className="mt-8"
      onClick={() => window.location.assign("/dashboard")}
    >
      Try again
    </Button>
  );
}
