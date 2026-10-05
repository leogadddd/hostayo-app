"use client";

import { RouteError } from "@/components/app/route-error";

/** Public pages have no dashboard, so the error screen only offers a retry. */
export default function PublicError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <RouteError {...props} showDashboardLink={false} />
    </main>
  );
}
