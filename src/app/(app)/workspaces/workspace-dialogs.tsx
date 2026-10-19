"use client";

import { useState } from "react";
import {
  CheckCircle,
  PencilSimple,
  Plus,
  Prohibit,
  Trash as Trash2,
} from "@/components/ui/icons";
import { toast } from "sonner";
import {
  ConfirmText,
  FormDialog,
  FormDialogButton,
} from "@/components/app/form-dialog";
import { Input, Label } from "@/components/ui/input";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import {
  createWorkspaceAction,
  deleteWorkspaceAction,
  setWorkspaceBlockedAction,
  updateWorkspaceAction,
} from "./actions";

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

export function NewWorkspaceDialog() {
  return (
    <FormDialogButton
      label="New workspace"
      icon={<Plus className="h-4 w-4" aria-hidden />}
      title="New workspace"
      info="The owner must already have an account. They become the workspace’s owner."
      submitLabel="Create workspace"
      onSubmit={(data) =>
        createWorkspaceAction({
          name: text(data, "name"),
          ownerEmail: text(data, "ownerEmail"),
        })
      }
    >
      <div>
        <Label htmlFor="workspace-name">Name</Label>
        <Input
          id="workspace-name"
          name="name"
          required
          maxLength={80}
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="workspace-owner">Owner’s email</Label>
        <Input
          id="workspace-owner"
          name="ownerEmail"
          type="email"
          required
          maxLength={120}
          autoComplete="off"
        />
      </div>
    </FormDialogButton>
  );
}

type Dialog = "edit" | "block" | "delete" | null;

export function WorkspaceActions({
  id,
  name,
  slug,
  blocked,
}: {
  id: string;
  name: string;
  slug: string;
  blocked: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };

  return (
    <>
      <TableActionsMenu
        label={name}
        actions={[
          {
            label: "Edit",
            icon: <PencilSimple className="h-4 w-4" aria-hidden />,
            onSelect: () => setDialog("edit"),
          },
          {
            label: blocked ? "Unblock" : "Block",
            icon: blocked ? (
              <CheckCircle className="h-4 w-4" aria-hidden />
            ) : (
              <Prohibit className="h-4 w-4" aria-hidden />
            ),
            onSelect: () => setDialog("block"),
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" aria-hidden />,
            onSelect: () => setDialog("delete"),
          },
        ]}
      />
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={close}
        title="Edit workspace"
        info="Changing the slug changes the workspace’s public page address."
        submitLabel="Save changes"
        onSubmit={(data) =>
          updateWorkspaceAction(id, {
            name: text(data, "name"),
            slug: text(data, "slug"),
          })
        }
      >
        <div>
          <Label htmlFor={`workspace-name-${id}`}>Name</Label>
          <Input
            id={`workspace-name-${id}`}
            name="name"
            required
            maxLength={80}
            autoComplete="off"
            defaultValue={name}
          />
        </div>
        <div>
          <Label htmlFor={`workspace-slug-${id}`}>Slug</Label>
          <Input
            id={`workspace-slug-${id}`}
            name="slug"
            required
            maxLength={60}
            autoComplete="off"
            defaultValue={slug}
          />
        </div>
      </FormDialog>
      <FormDialog
        open={dialog === "block"}
        onOpenChange={close}
        title={blocked ? "Unblock this workspace?" : "Block this workspace?"}
        submitLabel={blocked ? "Unblock" : "Block workspace"}
        destructive={!blocked}
        onSubmit={async () => {
          const result = await setWorkspaceBlockedAction(id, !blocked);
          if (!("error" in result))
            toast.success(
              blocked ? "Workspace unblocked." : "Workspace blocked.",
            );
          return result;
        }}
      >
        <ConfirmText>
          {blocked
            ? `${name}’s members can open it again.`
            : `${name}’s members can’t open it until you unblock it. Nothing is deleted.`}
        </ConfirmText>
      </FormDialog>
      <FormDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title="Delete this workspace?"
        info="Everything in it is removed for good: properties, reservations, guests, payments and the team. Uploaded files stay in storage."
        submitLabel="Delete workspace"
        destructive
        onSubmit={(data) => deleteWorkspaceAction(id, text(data, "confirm"))}
      >
        <div>
          <Label htmlFor={`workspace-confirm-${id}`}>
            Type “{name}” to confirm
          </Label>
          <Input
            id={`workspace-confirm-${id}`}
            name="confirm"
            required
            autoComplete="off"
          />
        </div>
      </FormDialog>
    </>
  );
}
