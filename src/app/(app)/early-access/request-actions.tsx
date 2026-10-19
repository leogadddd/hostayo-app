"use client";

import { useTransition } from "react";
import {
  Envelope as Mail,
  EnvelopeOpen as MailOpen,
  PaperPlaneTilt,
  CheckCircle,
  Trash as Trash2,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EntryDialog, type EntryValues } from "./entry-dialog";
import {
  acceptEntry,
  deleteRequest,
  markAllRequestsRead,
  setRequestRead,
} from "./actions";

export function RequestActions({
  entry,
  read,
  accepted,
}: {
  entry: EntryValues;
  read: boolean;
  accepted: boolean;
}) {
  const { id, name } = entry;
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={read ? `Mark ${name} as unread` : `Mark ${name} as read`}
        title={read ? "Mark as unread" : "Mark as read"}
        onClick={() =>
          startTransition(async () => {
            const result = await setRequestRead(id, !read);
            if (result.error) toast.error(result.error);
          })
        }
      >
        {read ? (
          <Mail className="h-4 w-4" aria-hidden />
        ) : (
          <MailOpen className="h-4 w-4" aria-hidden />
        )}
      </Button>
      <ConfirmationDialog
        trigger={
          accepted ? (
            <PaperPlaneTilt className="h-4 w-4" aria-hidden />
          ) : (
            <CheckCircle className="h-4 w-4" aria-hidden />
          )
        }
        triggerSize="sm"
        triggerAriaLabel={
          accepted ? `Send ${name} a new invite` : `Accept ${name}`
        }
        title={accepted ? "Send a new invite?" : "Accept this request?"}
        description={
          accepted
            ? `${name} gets a welcome email with a new sign-up link. Their earlier link stops working.`
            : `${name} gets a welcome email with a sign-up link for ${entry.email}.`
        }
        confirmLabel={accepted ? "Send invite" : "Accept and send"}
        successMessage={
          accepted ? "Invite sent." : "Accepted. Welcome email sent."
        }
        onConfirm={async () => {
          const result = await acceptEntry(id);
          if (result.error) throw new Error(result.error);
        }}
      />
      <EntryDialog entry={entry} />
      <ConfirmationDialog
        trigger={<Trash2 className="h-4 w-4" aria-hidden />}
        triggerSize="sm"
        triggerAriaLabel={`Delete request from ${name}`}
        title="Delete this request?"
        description={`${name}'s early-access request will be removed for good. This can't be undone.`}
        confirmLabel="Delete request"
        successMessage="Request deleted."
        onConfirm={async () => {
          const result = await deleteRequest(id);
          if (result.error) throw new Error(result.error);
        }}
      />
    </div>
  );
}

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllRequestsRead();
          if (result.error) toast.error(result.error);
        })
      }
    >
      Mark all as read
    </Button>
  );
}
