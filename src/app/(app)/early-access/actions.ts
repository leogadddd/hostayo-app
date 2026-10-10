"use server";

import { revalidatePath } from "next/cache";
import { isL1, requireUser } from "@/lib/auth/session";
import {
  deleteEarlyAccessRequest,
  markAllEarlyAccessRead,
  setEarlyAccessRead,
} from "@/server/early-access/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every action re-checks L1: a server action is a public endpoint. */
async function requireOperator(): Promise<boolean> {
  const user = await requireUser();
  return isL1(user.id);
}

export async function setRequestRead(id: string, read: boolean) {
  if (!(await requireOperator()) || !UUID.test(id))
    return { error: "Not allowed." };
  await setEarlyAccessRead(id, read);
  revalidatePath("/early-access");
  return { success: true };
}

export async function markAllRequestsRead() {
  if (!(await requireOperator())) return { error: "Not allowed." };
  await markAllEarlyAccessRead();
  revalidatePath("/early-access");
  return { success: true };
}

export async function deleteRequest(id: string) {
  if (!(await requireOperator()) || !UUID.test(id))
    return { error: "Not allowed." };
  await deleteEarlyAccessRequest(id);
  revalidatePath("/early-access");
  return { success: true };
}
