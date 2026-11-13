import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { EditorCancel, PropertyEditor } from "@/components/admin/properties/property-editor";
import { siteHost } from "@/components/admin/properties/site-host";
import { blobPathPrefix } from "@/lib/storage";
import { getAdminProperty } from "@/lib/db/queries/admin-properties";

export const metadata: Metadata = { title: "Edit property" };

/**
 * /admin/properties/[id]: the editor for one property (admin-only data, including the private
 * address, read live via getAdminProperty → requireAdmin()).
 */
export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getAdminProperty(id);
  if (!property) notFound();
  return (
    <>
      <AdminTopbar
        title="Edit property"
        crumb={`Properties / ${property.values.title}`}
        actions={<EditorCancel />}
      />
      <AdminContent>
        <PropertyEditor
          key={`${property.id}-${property.updatedAt.toISOString()}`}
          property={{
            id: property.id,
            slug: property.slug,
            status: property.status,
            createdAt: property.createdAt.toISOString(),
            updatedAt: property.updatedAt.toISOString(),
            images: property.images,
          }}
          initialValues={property.values}
          siteHost={siteHost()}
          uploadPrefix={blobPathPrefix()}
        />
      </AdminContent>
    </>
  );
}
