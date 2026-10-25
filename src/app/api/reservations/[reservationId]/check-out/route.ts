import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/auth/session";
import {
  apiMembership,
  errorResponse,
  json,
  readJsonObject,
} from "@/lib/api/respond";
import { checkOut } from "@/server/operations/service";
import { hasReached } from "@/server/operations/replay";
import { ReservationError } from "@/server/reservations/validation";

export const runtime = "nodejs";

/**
 * Checks the guest out. Replaying it after it already happened answers
 * success instead of "cannot be checked out", so a retry is harmless.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reservationId: string }> },
) {
  const membership = await apiMembership();
  if (membership instanceof Response) return membership;
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  const { reservationId } = await params;
  try {
    assertCan(membership, "stays.update");
    await checkOut({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      data: body,
    });
  } catch (error) {
    if (
      error instanceof ReservationError &&
      (await hasReached(
        membership.organizationId,
        reservationId,
        "checked_out",
      ))
    ) {
      return json({ alreadyDone: true });
    }
    return errorResponse(error);
  }
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  return json({ alreadyDone: false });
}
