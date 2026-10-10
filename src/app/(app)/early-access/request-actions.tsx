"use client";

import { useTransition } from "react";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  deleteRequest,
  markAllRequestsRead,
  setRequestRead,
} from "./actions";

export function RequestActions({
  id,
  name,
  read,
}: {
  id: string;
  name: string;
  read: boolean;
}) {
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
