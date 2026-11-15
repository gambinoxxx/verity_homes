import type { Metadata } from "next";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { SettingsEditor } from "@/components/admin/settings/settings-editor";
import { getAdminSettings } from "@/lib/db/queries/admin-settings";

export const metadata: Metadata = { title: "Site settings" };

/**
 * /admin/settings (Unit 19a): contact details, office + map, company, social links, website
 * text and the privacy-notice status — one form, one Save. Read live (requireAdmin(), not
 * cached), inside the (panel) layout's <Suspense> gate. Panels have anchors (#contact, #office,
 * #company, #social, #content, #privacy) for the dashboard checklist.
 */
export default async function AdminSettingsPage() {
  const s = await getAdminSettings();
  return (
    <>
      <AdminTopbar title="Site settings" crumb="Business" />
      <AdminContent>
        <SettingsEditor
          initialValues={s.values}
          privacyReviewedAt={s.privacyReviewedAt?.toISOString() ?? null}
          updatedAt={s.updatedAt?.toISOString() ?? null}
        />
      </AdminContent>
    </>
  );
}
