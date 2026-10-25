import { revalidatePath } from "next/cache";
import {
  apiMembership,
  errorResponse,
  json,
  readJsonObject,
} from "@/lib/api/respond";
import {
  createReservationFromRequest,
  type CreateReservationRequest,
} from "@/server/reservations/create-request";

export const runtime = "nodejs";

/**
 * Creates a hold or a confirmed reservation. The offline outbox replays this
 * request as it was first made, so `idempotencyKey` is required: sending it
 * again returns the reservation it already created.
 */
export async function POST(request: Request) {
  const membership = await apiMembership();
  if (membership instanceof Response) return membership;
  const body = await readJsonObject(request);
  if (body instanceof Response) return body;
  if (typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
    return json({ error: "The request is missing its idempotency key." }, 422);
  }
  try {
    const reservation = await createReservationFromRequest(
      membership,
      body as unknown as CreateReservationRequest,
    );
    revalidatePath("/calendar");
    revalidatePath("/reservations");
    return json({ reservationId: reservation.id });
  } catch (error) {
    return errorResponse(error);
  }
}
