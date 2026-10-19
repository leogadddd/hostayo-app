"use server";

import { revalidatePath } from "next/cache";
import { l1Action } from "@/server/l1-action";
import {
  createWorkspace,
  deleteWorkspace,
  setWorkspaceBlocked,
  updateWorkspace,
} from "@/server/workspaces/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createWorkspaceAction(input: {
  name: string;
  ownerEmail: string;
}) {
  return l1Action(async (actorUserId) => {
    await createWorkspace({ ...input, actorUserId });
    revalidatePath("/workspaces");
    return { message: "Workspace created." };
  });
}

export async function updateWorkspaceAction(
  id: string,
  input: { name: string; slug: string },
) {
  return l1Action(async () => {
    if (!UUID.test(id)) return { error: "Not allowed." };
    await updateWorkspace(id, input);
    revalidatePath("/workspaces");
    return { message: "Workspace updated." };
  });
}

export async function setWorkspaceBlockedAction(id: string, blocked: boolean) {
  return l1Action(async () => {
    if (!UUID.test(id)) return { error: "Not allowed." };
    await setWorkspaceBlocked(id, blocked);
    revalidatePath("/workspaces");
    return { success: true };
  });
}

export async function deleteWorkspaceAction(id: string, confirmName: string) {
  return l1Action(async () => {
    if (!UUID.test(id)) return { error: "Not allowed." };
    await deleteWorkspace(id, confirmName);
    revalidatePath("/workspaces");
    return { message: "Workspace deleted." };
  });
}
