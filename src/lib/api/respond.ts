import "server-only";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";
import {
  PermissionError,
  requireMembership,
  type MembershipContext,
} from "@/lib/auth/session";
import { MoneyParseError } from "@/lib/money";
import { unexpectedErrorMessage } from "@/lib/errors";
import { InventoryError } from "@/server/inventory/validation";
import { OperationsError } from "@/server/operations/validation";
import { PaymentError } from "@/server/payments/validation";
import { ReservationError } from "@/server/reservations/validation";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * The signed-in member for a JSON endpoint. The page guard redirects to the
 * login page, which a replayed request would follow and mistake for success,
 * so a missing session or workspace is a plain 401 here instead.
 */
export async function apiMembership(): Promise<MembershipContext | Response> {
  try {
    return await requireMembership();
  } catch (error) {
    if (isRedirectError(error)) {
      return json({ error: "Sign in again to continue." }, 401);
    }
    throw error;
  }
}

/** The request's JSON object, or a 400 response when it isn't one. */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // Falls through to the shared message below.
  }
  return json({ error: "The request could not be read." }, 400);
}

/**
 * Maps what the services throw to a status the outbox understands: refusals
 * are 4xx (never retried), anything unexpected is 500 (kept and retried).
 */
export function errorResponse(error: unknown): Response {
  if (error instanceof PermissionError) {
    return json({ error: error.message }, 403);
  }
  if (
    error instanceof ReservationError ||
    error instanceof InventoryError ||
    error instanceof OperationsError ||
    error instanceof PaymentError ||
    error instanceof MoneyParseError
  ) {
    return json({ error: error.message }, 409);
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return json(
      { error: first ? first.message : "Check the details and try again." },
      422,
    );
  }
  return json({ error: unexpectedErrorMessage(error, "api") }, 500);
}
