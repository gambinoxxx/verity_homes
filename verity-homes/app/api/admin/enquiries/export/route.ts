// CSV export of the enquiries inbox (Unit 16): the rows matching the current filters
// (status, search, interest — all pages), newest first. Admin only: 401 signed out, 403 for
// other accounts; exportAdminEnquiries() calls requireAdmin() again. Never cached.
import { adminAccess } from "@/lib/auth";
import { exportAdminEnquiries } from "@/lib/db/queries/admin-enquiries";
import { csvFileName, enquiriesCsv } from "@/lib/enquiry-inbox";
import { parseEnquiryFilters } from "@/lib/validation/admin-enquiry-filters";

export async function GET(request: Request): Promise<Response> {
  const access = await adminAccess();
  if (access !== "admin") {
    const status = access === "signed-out" ? 401 : 403;
    const message = status === 401 ? "Please sign in again." : "You don't have permission.";
    return new Response(message, { status, headers: { "Cache-Control": "no-store" } });
  }
  const url = new URL(request.url);
  const filters = parseEnquiryFilters(Object.fromEntries(url.searchParams));
  const rows = await exportAdminEnquiries(filters);
  return new Response(enquiriesCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFileName(new Date())}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
