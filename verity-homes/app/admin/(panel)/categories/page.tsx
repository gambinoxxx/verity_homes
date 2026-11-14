import type { Metadata } from "next";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { CategoryManager } from "@/components/admin/posts/category-manager";
import { listAdminCategories } from "@/lib/db/queries/admin-posts";

export const metadata: Metadata = { title: "Categories" };

/**
 * /admin/categories (Unit 18): blog categories on one page, edited inline. Alphabetical (Q40).
 * A category can be deleted only when no post uses it. Always live.
 */
export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  return (
    <>
      <AdminTopbar title="Categories" crumb="Content / Blog posts" />
      <AdminContent>
        <CategoryManager categories={categories} />
      </AdminContent>
    </>
  );
}
