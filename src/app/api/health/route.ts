// Answers "can this browser reach the server right now?" for the connection
// indicator. It touches nothing else (no database, no session) so it stays
// fast and works for signed-out visitors too.
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export function GET() {
  return Response.json({ ok: true }, { headers });
}

export function HEAD() {
  return new Response(null, { status: 200, headers });
}
