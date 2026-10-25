"use client";

import { SignOut as LogOut } from "@/components/ui/icons";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { signOutAndRedirect } from "@/lib/auth/sign-out";

export function SignOutButton({ isDemoAccount }: { isDemoAccount: boolean }) {
  return (
    <ConfirmationDialog
      title="Sign out of Hostayo?"
      description="You will return to the sign-in page. Any unsaved form changes on this page will be lost."
      confirmLabel="Sign out"
      successMessage={null}
      loadingLabel="Signing you out…"
      onConfirm={() => signOutAndRedirect(undefined, isDemoAccount)}
      trigger={
        <>
          <LogOut className="h-5 w-5" aria-hidden />
          Sign out
        </>
      }
      triggerClassName="h-14 w-full justify-start rounded-none px-4 text-clay-deep hover:bg-clay-mist/70"
    />
  );
}
