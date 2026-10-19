"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOutAndRedirect } from "@/lib/auth/sign-out";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="mt-8"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await signOutAndRedirect();
        } catch {
          setPending(false);
        }
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
