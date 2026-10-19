"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle,
  Envelope as Mail,
  EnvelopeOpen as MailOpen,
  PaperPlaneTilt,
  PencilSimple,
  Prohibit,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { ConfirmText, FormDialog } from "@/components/app/form-dialog";
import { Button } from "@/components/ui/button";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { EditEntryDialog, type EntryValues } from "./entry-dialog";
import {
  acceptEntry,
  deleteRequest,
  markAllRequestsRead,
  restoreEntry,
  revokeEntry,
  setRequestRead,
} from "./actions";

type Dialog = "edit" | "accept" | "revoke" | "restore" | null;

export function RequestActions({
  entry,
  read,
  accepted,
  registered,
  blocked,
}: {
  entry: EntryValues;
  read: boolean;
  accepted: boolean;
  /** They already created an account. */
  registered: boolean;
  /** Their account is blocked because early access was revoked. */
  blocked: boolean;
}) {
  const { id, name } = entry;
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const toggleRead = () =>
    startTransition(async () => {
      const result = await setRequestRead(id, !read);
      if (result.error) toast.error(result.error);
    });

  return (
    <>
      <TableActionsMenu
        label={name}
        actions={[
          {
            label: read ? "Mark as unread" : "Mark as read",
            icon: read ? (
              <Mail className="h-4 w-4" aria-hidden />
            ) : (
              <MailOpen className="h-4 w-4" aria-hidden />
            ),
            onSelect: toggleRead,
          },
          ...(registered || blocked
            ? []
            : [
                {
                  label: accepted ? "Send new invite" : "Accept",
                  icon: accepted ? (
                    <PaperPlaneTilt className="h-4 w-4" aria-hidden />
                  ) : (
                    <CheckCircle className="h-4 w-4" aria-hidden />
                  ),
                  onSelect: () => setDialog("accept"),
                },
              ]),
          ...(blocked
            ? [
                {
                  label: "Restore access",
                  icon: <CheckCircle className="h-4 w-4" aria-hidden />,
                  onSelect: () => setDialog("restore"),
                },
              ]
            : accepted
              ? [
                  {
                    label: "Revoke access",
                    icon: <Prohibit className="h-4 w-4" aria-hidden />,
                    onSelect: () => setDialog("revoke"),
                  },
                ]
              : []),
          {
            label: "Edit",
            icon: <PencilSimple className="h-4 w-4" aria-hidden />,
            onSelect: () => setDialog("edit"),
          },
        ]}
        deleteLabel="Delete this request?"
        deleteDescription={`${name}'s early-access request will be removed for good. This can't be undone.`}
        deleteSuccessMessage="Request deleted."
        destructiveActionLabel="Delete"
        onDelete={() => deleteRequest(id)}
      />
      <EditEntryDialog
        entry={entry}
        open={dialog === "edit"}
        onOpenChange={close}
      />
      <FormDialog
        open={dialog === "accept"}
        onOpenChange={close}
        title={accepted ? "Send a new invite?" : "Accept this request?"}
        submitLabel={accepted ? "Send invite" : "Accept and send"}
        onSubmit={async () => {
          const result = await acceptEntry(id);
          if (!result.error)
            toast.success(
              accepted ? "Invite sent." : "Accepted. Welcome email sent.",
            );
          return result;
        }}
      >
        <ConfirmText>
          {accepted
            ? `${name} gets a welcome email with a new sign-up link. Their earlier link stops working.`
            : `${name} gets a welcome email with a sign-up link for ${entry.email}.`}
        </ConfirmText>
      </FormDialog>
      <FormDialog
        open={dialog === "revoke"}
        onOpenChange={close}
        title="Revoke early access?"
        submitLabel="Revoke access"
        destructive
        onSubmit={async () => {
          const result = await revokeEntry(id);
          if (!result.error) toast.success("Early access revoked.");
          return result;
        }}
      >
        <ConfirmText>
          {registered
            ? `${name} already has an account. It is blocked and signed out everywhere, and ${name} can't sign in until you restore access.`
            : `${name}'s sign-up link stops working and the request goes back to pending. No email is sent.`}
        </ConfirmText>
      </FormDialog>
      <FormDialog
        open={dialog === "restore"}
        onOpenChange={close}
        title="Restore access?"
        submitLabel="Restore access"
        onSubmit={async () => {
          const result = await restoreEntry(id);
          if (!result.error) toast.success("Access restored.");
          return result;
        }}
      >
        <ConfirmText>
          {name}&apos;s account is unblocked and they can sign in again.
        </ConfirmText>
      </FormDialog>
    </>
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
