import { revalidatePath } from "next/cache";
import { assertCan } from "@/lib/auth/session";
import {
  apiMembership,
  errorResponse,
  json,
  readJsonObject,
} from "@/lib/api/respond";
import { recordPayment } from "@/server/payments/service";

export const runtime = "nodejs";

/** Records a payment. `idempotencyKey` is required so a replay adds nothing twice. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reservationId: string }> },
) {
  const membership = await apiMembership();
  if (membership instanceof Response) return membership;
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  if (typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
    return json({ error: "The request is missing its idempotency key." }, 422);
  }
  const { reservationId } = await params;
  try {
    assertCan(membership, "payments.create");
    const { entry, alreadyRecorded } = await recordPayment({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      data: body,
    });
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/reservations");
    return json({ paymentId: entry.id, alreadyRecorded });
  } catch (error) {
    return errorResponse(error);
  }
}
