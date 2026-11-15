// CSV export of newsletter subscribers (Unit 19b): every row matching the current search, newest
// first. Admin only: 401 signed out, 403 for other accounts; exportAdminSubscribers() calls
// requireAdmin() again. Never cached.
import { adminAccess } from "@/lib/auth";
import { exportAdminSubscribers } from "@/lib/db/queries/admin-trust";
import { parseSubscriberFilters, subscribersCsv, subscribersCsvFileName } from "@/lib/subscribers";

export async function GET(request: Request): Promise<Response> {
  const access = await adminAccess();
  if (access !== "admin") {
    const status = access === "signed-out" ? 401 : 403;
    const message = status === 401 ? "Please sign in again." : "You don't have permission.";
    return new Response(message, { status, headers: { "Cache-Control": "no-store" } });
  }
  const { q } = parseSubscriberFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await exportAdminSubscribers(q);
  return new Response(subscribersCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${subscribersCsvFileName(new Date())}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
