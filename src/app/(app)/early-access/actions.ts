"use server";

import { revalidatePath } from "next/cache";
import { isL1, requireUser } from "@/lib/auth/session";
import {
  acceptEarlyAccessEntry,
  createEarlyAccessEntry,
  deleteEarlyAccessRequest,
  parseEarlyAccessEntry,
  updateEarlyAccessEntry,
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

export interface EntryInput {
  name: string;
  email: string;
  social?: string;
  units?: string;
  source?: string;
}

export async function createEntry(input: EntryInput) {
  if (!(await requireOperator())) return { error: "Not allowed." };
  const parsed = parseEarlyAccessEntry({
    name: input.name,
    email: input.email,
  });
  if ("error" in parsed) return { error: parsed.error };
  const id = await createEarlyAccessEntry(parsed.entry);
  // An entry added by hand is accepted straight away: link made, welcome sent.
  const accepted = await acceptEarlyAccessEntry(id);
  revalidatePath("/early-access");
  return accepted.error ? { error: accepted.error } : { success: true };
}

export async function updateEntry(id: string, input: EntryInput) {
  if (!(await requireOperator()) || !UUID.test(id))
    return { error: "Not allowed." };
  const parsed = parseEarlyAccessEntry(input);
  if ("error" in parsed) return { error: parsed.error };
  await updateEarlyAccessEntry(id, parsed.entry);
  revalidatePath("/early-access");
  return { success: true };
}

/** Accepts an entry, or sends its invite again with a fresh link. */
export async function acceptEntry(id: string) {
  if (!(await requireOperator()) || !UUID.test(id))
    return { error: "Not allowed." };
  const accepted = await acceptEarlyAccessEntry(id);
  revalidatePath("/early-access");
  return accepted.error ? { error: accepted.error } : { success: true };
}
