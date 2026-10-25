"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  DotsThree as MoreHorizontal,
  PencilSimple as Pencil,
  Trash as Trash2,
} from "@/components/ui/icons";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Sheet } from "@/components/ui/sheet";

type CancelResult = { error?: string; success?: boolean };

const ROW =
  "flex h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-[15px] font-semibold text-pine shadow-[0_1px_4px_rgba(32,58,53,0.08)] ring-1 ring-pine/[0.06] active:bg-pine-mist";

/** The ⋯ button on a phone reservation card, opening its actions in a bottom sheet. */
export function ReservationRowActions({
  guestName,
  viewHref,
  editHref,
  onCancel,
}: {
  guestName: string;
  viewHref: string;
  editHref?: string | null;
  /** Present only when this reservation can be cancelled by this person. */
  onCancel?: () => Promise<CancelResult>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Open actions for reservation for ${guestName}`}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-pine/[0.06] text-pine active:bg-pine/15"
      >
        <MoreHorizontal className="h-6 w-6" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={guestName}>
        <div className="space-y-2.5 pb-2 pt-1">
          <Link href={viewHref} className={ROW} onClick={() => setOpen(false)}>
            <Eye className="h-5 w-5 text-moss" aria-hidden />
            View reservation
          </Link>
          {editHref ? (
            <Link
              href={editHref}
              className={ROW}
              onClick={() => setOpen(false)}
            >
              <Pencil className="h-5 w-5 text-moss" aria-hidden />
              Edit reservation
            </Link>
          ) : null}
          {onCancel ? (
            <ConfirmationDialog
              title={`Cancel reservation for ${guestName}?`}
              description="This safely cancels the reservation and releases its dates. It keeps payment, task, and audit history; it does not permanently delete records."
              confirmLabel="Cancel"
              successMessage="Reservation cancelled."
              onConfirm={async () => {
                const result = await onCancel();
                if (result.error) throw new Error(result.error);
                setOpen(false);
                router.refresh();
              }}
              trigger={
                <>
                  <Trash2 className="h-5 w-5" aria-hidden />
                  Cancel reservation
                </>
              }
              triggerClassName="h-14 w-full justify-start gap-3 rounded-2xl bg-clay-mist/60 px-4 text-[15px] text-clay-deep hover:bg-clay-mist"
            />
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
