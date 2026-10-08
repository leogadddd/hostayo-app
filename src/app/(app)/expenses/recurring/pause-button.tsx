"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setRecurringActiveAction } from "./actions";

export function PauseButton({
  recurringId,
  active,
}: {
  recurringId: string;
  active: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await setRecurringActiveAction(recurringId, !active);
          if (result.error)
            toast.error("That didn’t work", { description: result.error });
          else toast.success(active ? "Paused." : "Resumed.");
        })
      }
      className="text-sm font-medium text-pine hover:underline disabled:opacity-50"
    >
      {active ? "Pause" : "Resume"}
    </button>
  );
}
