import { timingSafeEqual } from "node:crypto";
import {
  createEarlyAccessRequest,
  parseEarlyAccessBody,
} from "@/server/early-access/service";

export const runtime = "nodejs";

function authorized(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Receives an early-access request from the marketing site's server, so it is
 * kept even when the notification email fails. Guarded by a shared secret;
 * the browser never calls this.
 */
export async function POST(request: Request) {
  const secret = process.env.EARLY_ACCESS_API_SECRET;
  if (!secret) {
    return Response.json(
      { error: "EARLY_ACCESS_API_SECRET is not configured." },
      { status: 500 },
    );
  }
  if (!authorized(request, secret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseEarlyAccessBody(body);
  if (!parsed) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await createEarlyAccessRequest(parsed);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("early-access request could not be saved", error);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }
}
