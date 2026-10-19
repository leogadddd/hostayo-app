import "server-only";

import { isL1, requireUser } from "@/lib/auth/session";
import { AccountError } from "@/server/accounts/service";
import { OrgError } from "@/server/orgs/service";

/**
 * Wraps an L1-only server action. A server action is a public endpoint, so
 * L1 is re-checked on every call; errors an operator can act on become a
 * message, anything else is logged and reported generically.
 */
export async function l1Action<T extends object>(
  run: (actorUserId: string) => Promise<T>,
): Promise<T | { error: string }> {
  const actor = await requireUser();
  if (!(await isL1(actor.id))) return { error: "Not allowed." };
  try {
    return await run(actor.id);
  } catch (error) {
    if (error instanceof AccountError || error instanceof OrgError)
      return { error: error.message };
    console.error("[l1] action failed", error);
    return { error: "Something went wrong. Please try again." };
  }
}
