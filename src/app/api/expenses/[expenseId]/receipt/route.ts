import { requirePermission } from "@/lib/auth/session";
import { getExpense } from "@/server/expenses/service";
import { photoResponse } from "@/server/inventory/photo-response";

export const runtime = "nodejs";

/** Serve an expense's receipt photo to members who can see expenses. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  const membership = await requirePermission("expenses.view");
  if (!membership) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }
  const { expenseId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(expenseId)) {
    return Response.json({ error: "Receipt not found." }, { status: 404 });
  }
  const expense = await getExpense(membership.organizationId, expenseId);
  return photoResponse(membership.organizationId, expense?.receiptKey);
}
