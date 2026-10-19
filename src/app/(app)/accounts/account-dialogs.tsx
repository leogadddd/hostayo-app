"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Key,
  PencilSimple,
  ShieldCheck,
  Plus,
  Prohibit,
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
  blockAccountAction,
  createAccountAction,
  deleteAccountAction,
  grantL1Action,
  revokeL1Action,
  resetPasswordAction,
  unblockAccountAction,
  updateAccountAction,
} from "./actions";

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

function Fields({ name, email }: { name?: string; email?: string }) {
  const id = useId();
  return (
    <>
      <div>
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          name="name"
          required
          maxLength={80}
          autoComplete="off"
          defaultValue={name}
        />
      </div>
      <div>
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          maxLength={120}
          autoComplete="off"
          defaultValue={email}
        />
      </div>
    </>
  );
}

export function NewAccountDialog() {
  return (
    <FormDialogButton
      label="New account"
      icon={<Plus className="h-4 w-4" aria-hidden />}
      title="New account"
      info="The account is created with a temporary password, shown once. No email is sent."
      submitLabel="Create account"
      onSubmit={(data) =>
        createAccountAction({
          name: text(data, "name"),
          email: text(data, "email"),
        })
      }
    >
      <Fields />
    </FormDialogButton>
  );
}

type Dialog = "edit" | "reset" | "block" | "l1" | null;

export function AccountActions({
  id,
  name,
  email,
  blocked,
  protectedAccount,
  isSelf,
  isL1,
  isDemo,
}: {
  id: string;
  name: string;
  email: string;
  blocked: boolean;
  /** L1 operators and the demo account: can't be blocked or deleted here. */
  protectedAccount: boolean;
  isSelf: boolean;
  isL1: boolean;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = (open: boolean) => {
    if (!open) setDialog(null);
  };
  const canBlock = !protectedAccount && !isSelf;

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
            label: "Reset password",
            icon: <Key className="h-4 w-4" aria-hidden />,
            onSelect: () => setDialog("reset"),
          },
          ...(isDemo || (isL1 && isSelf)
            ? []
            : [
                {
                  label: isL1 ? "Revoke L1" : "Grant L1",
                  icon: <ShieldCheck className="h-4 w-4" aria-hidden />,
                  onSelect: () => setDialog("l1"),
                },
              ]),
          ...(canBlock
            ? [
                {
                  label: blocked ? "Unblock" : "Block",
                  icon: blocked ? (
                    <CheckCircle className="h-4 w-4" aria-hidden />
                  ) : (
                    <Prohibit className="h-4 w-4" aria-hidden />
                  ),
                  onSelect: () => setDialog("block"),
                },
              ]
            : []),
        ]}
        deleteLabel={`Delete ${name}?`}
        deleteDescription="The account is removed for good, along with its sessions and workspace memberships. This can't be undone."
        deleteSuccessMessage="Account deleted."
        onDelete={canBlock ? () => deleteAccountAction(id) : undefined}
      />
      <FormDialog
        open={dialog === "edit"}
        onOpenChange={close}
        title="Edit account"
        submitLabel="Save changes"
        onSubmit={(data) =>
          updateAccountAction(id, {
            name: text(data, "name"),
            email: text(data, "email"),
          })
        }
      >
        <Fields name={name} email={email} />
      </FormDialog>
      <FormDialog
        open={dialog === "reset"}
        onOpenChange={close}
        title="Reset password?"
        info="They get a new temporary password, shown once."
        submitLabel="Reset password"
        onSubmit={() => resetPasswordAction(id)}
      >
        <ConfirmText>
          {name} is signed out everywhere and their old password stops working.
        </ConfirmText>
      </FormDialog>
      <FormDialog
        open={dialog === "l1"}
        onOpenChange={close}
        title={isL1 ? "Revoke L1 access?" : "Grant L1 access?"}
        info="Enter your own password to confirm."
        submitLabel={isL1 ? "Revoke L1" : "Grant L1"}
        destructive={isL1}
        onSubmit={(data) =>
          isL1
            ? revokeL1Action(id, text(data, "password"))
            : grantL1Action(id, text(data, "password"))
        }
      >
        <ConfirmText>
          {isL1
            ? `${name} loses owner access to every workspace and the L1 pages.`
            : `${name} gets owner access to every workspace and can manage all accounts and workspaces, including granting L1 to others.`}
        </ConfirmText>
        <div>
          <Label htmlFor={`${id}-l1-password`}>Your password</Label>
          <Input
            id={`${id}-l1-password`}
            name="password"
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
          />
        </div>
      </FormDialog>
      <FormDialog
        open={dialog === "block"}
        onOpenChange={close}
        title={blocked ? "Unblock this account?" : "Block this account?"}
        submitLabel={blocked ? "Unblock" : "Block account"}
        destructive={!blocked}
        onSubmit={async () => {
          const result = blocked
            ? await unblockAccountAction(id)
            : await blockAccountAction(id);
          if (!("error" in result)) {
            toast.success(blocked ? "Account unblocked." : "Account blocked.");
            router.refresh();
          }
          return result;
        }}
      >
        <ConfirmText>
          {blocked
            ? `${name} can sign in again.`
            : `${name} is signed out everywhere and can't sign in until you unblock the account.`}
        </ConfirmText>
      </FormDialog>
    </>
  );
}
