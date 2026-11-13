import type { Metadata } from "next";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { FaqManager } from "@/components/admin/faqs/faq-manager";
import ui from "@/components/admin/ui.module.css";
import { listAdminFaqs } from "@/lib/db/queries/admin-plans";

export const metadata: Metadata = { title: "FAQs" };

/**
 * /admin/faqs (Unit 17): FAQs grouped by page, edited inline. Invest FAQs show on /invest;
 * General FAQs are kept for a future page (none shows them yet — Q51). Always live.
 */
export default async function AdminFaqsPage() {
  const faqs = await listAdminFaqs();
  return (
    <>
      <AdminTopbar title="FAQs" crumb="Content" />
      <AdminContent>
        <div className={`${ui.alert} ${ui.warn}`} role="note">
          <div>
            <b>Invest page</b> FAQs appear on /invest, in this order, once published. <b>General</b>{" "}
            FAQs are saved for later — no page shows them yet.
          </div>
        </div>
        <FaqManager faqs={faqs} />
      </AdminContent>
    </>
  );
}
