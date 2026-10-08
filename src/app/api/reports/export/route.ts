import { requirePermission } from "@/lib/auth/session";
import {
  EXPORT_TYPES,
  exportBookings,
  exportExpenses,
  exportPayments,
  type ExportType,
} from "@/server/reports/exports";
import { ReportError } from "@/server/reports/service";

export const runtime = "nodejs";

/** CSV downloads behind the Reports page; same permission as the page. */
export async function GET(request: Request) {
  const membership = await requirePermission("reports.view");
  if (!membership) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const type = params.get("type") as ExportType | null;
  if (!type || !EXPORT_TYPES.includes(type)) {
    return Response.json({ error: "Unknown export." }, { status: 400 });
  }
  const filters = {
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    propertyId: params.get("property") || undefined,
  };
  try {
    const run =
      type === "bookings"
        ? exportBookings
        : type === "payments"
          ? exportPayments
          : exportExpenses;
    const { filename, csv } = await run(membership.organizationId, filters);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReportError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
