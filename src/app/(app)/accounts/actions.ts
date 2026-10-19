"use server";

import { revalidatePath } from "next/cache";
import { l1Action } from "@/server/l1-action";
import {
  blockAccount,
  createAccount,
  deleteAccount,
  grantL1,
  revokeL1,
  resetAccountPassword,
  unblockAccount,
  updateAccount,
} from "@/server/accounts/service";

const ID = /^[A-Za-z0-9_-]{8,64}$/;
const PASSWORD_NOTE =
  "Shown once. Share it privately; they can change it after signing in.";

function valid(id: string) {
  return ID.test(id);
}

export async function createAccountAction(input: {
  name: string;
  email: string;
}) {
  return l1Action(async () => {
    const created = await createAccount(input);
    revalidatePath("/accounts");
    return {
      secret: {
        label: `Temporary password for ${created.email}`,
        value: created.temporaryPassword,
        info: PASSWORD_NOTE,
      },
    };
  });
}

export async function updateAccountAction(
  id: string,
  input: { name: string; email: string },
) {
  return l1Action(async () => {
    if (!valid(id)) return { error: "Not allowed." };
    await updateAccount(id, input);
    revalidatePath("/accounts");
    return { message: "Account updated." };
  });
}

export async function resetPasswordAction(id: string) {
  return l1Action(async () => {
    if (!valid(id)) return { error: "Not allowed." };
    const reset = await resetAccountPassword(id);
    revalidatePath("/accounts");
    return {
      secret: {
        label: `New password for ${reset.email}`,
        value: reset.temporaryPassword,
        info: `${PASSWORD_NOTE} They were signed out everywhere.`,
      },
    };
  });
}

export async function blockAccountAction(id: string) {
  return l1Action(async (actorUserId) => {
    if (!valid(id)) return { error: "Not allowed." };
    await blockAccount(id, { actorUserId, reason: "Blocked by an operator" });
    revalidatePath("/accounts");
    return { success: true };
  });
}

export async function unblockAccountAction(id: string) {
  return l1Action(async () => {
    if (!valid(id)) return { error: "Not allowed." };
    await unblockAccount(id);
    revalidatePath("/accounts");
    return { success: true };
  });
}

export async function deleteAccountAction(id: string) {
  return l1Action(async (actorUserId) => {
    if (!valid(id)) return { error: "Not allowed." };
    await deleteAccount(id, { actorUserId });
    revalidatePath("/accounts");
    return { success: true };
  });
}

export async function grantL1Action(id: string, password: string) {
  return l1Action(async (actorUserId) => {
    if (!valid(id)) return { error: "Not allowed." };
    await grantL1(id, { actorUserId, actorPassword: password });
    revalidatePath("/accounts");
    return { message: "L1 access granted." };
  });
}

export async function revokeL1Action(id: string, password: string) {
  return l1Action(async (actorUserId) => {
    if (!valid(id)) return { error: "Not allowed." };
    await revokeL1(id, { actorUserId, actorPassword: password });
    revalidatePath("/accounts");
    return { message: "L1 access revoked." };
  });
}
