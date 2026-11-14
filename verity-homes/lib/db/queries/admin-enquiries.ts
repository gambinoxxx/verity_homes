// Admin enquiries inbox reads (Unit 16). Every function calls requireAdmin() itself and is not
// cached: the inbox is always live.
import "server-only";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { CsvEnquiry } from "@/lib/enquiry-inbox";
import { packageName, packageSummary } from "@/lib/packages";
import { plotName } from "@/lib/plots";
import {
  type EnquiryFilters,
  INTEREST_PARAM,
  TAB_STATUS,
} from "@/lib/validation/admin-enquiry-filters";

export const ENQUIRIES_PAGE_SIZE = 20;
const CSV_MAX_ROWS = 10_000;

/** Search (name, phone, email, message) + interest — the part shared by tabs, list and CSV. */
function baseWhere(f: Pick<EnquiryFilters, "q" | "interest">): Prisma.EnquiryWhereInput {
  const or: Prisma.EnquiryWhereInput[] = [];
  if (f.q) {
    for (const field of ["name", "email", "message", "phone"] as const) {
      or.push({ [field]: { contains: f.q, mode: "insensitive" } });
    }
    // Phones are stored as digits (2348030000000): "0803 000" also finds them.
    const digits = f.q.replace(/\D/g, "").replace(/^0/, "");
    if (digits.length >= 4) or.push({ phone: { contains: digits } });
  }
  return {
    ...(f.interest ? { interest: INTEREST_PARAM[f.interest] } : {}),
    ...(or.length ? { OR: or } : {}),
  };
}

function statusWhere(f: EnquiryFilters): Prisma.EnquiryWhereInput {
  const base = baseWhere(f);
  return f.status === "all" ? base : { ...base, status: TAB_STATUS[f.status] };
}

const ORDER = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.EnquiryOrderByWithRelationInput[];

const rowSelect = {
  id: true,
  name: true,
  interest: true,
  source: true,
  status: true,
  createdAt: true,
  property: { select: { id: true, title: true } },
  plan: { select: { id: true, name: true } },
  plot: { select: { label: true, sizeSqm: true } }, // Unit 17b
  package: {
    select: { label: true, amountKobo: true, returnAmountKobo: true, tenureMonths: true },
  }, // Unit 17c
} satisfies Prisma.EnquirySelect;

export type EnquiryRow = Prisma.EnquiryGetPayload<{ select: typeof rowSelect }>;

export type EnquiryList = {
  rows: EnquiryRow[];
  total: number;
  counts: { all: number; new: number; contacted: number; closed: number };
  page: number;
  pageSize: number;
  /** Nothing in the inbox at all (not just nothing matching). */
  inboxEmpty: boolean;
};

export async function listAdminEnquiries(f: EnquiryFilters): Promise<EnquiryList> {
  await requireAdmin();
  const base = baseWhere(f);
  const [rows, grouped, everything] = await Promise.all([
    db.enquiry.findMany({
      where: statusWhere(f),
      orderBy: ORDER,
      skip: (f.page - 1) * ENQUIRIES_PAGE_SIZE,
      take: ENQUIRIES_PAGE_SIZE,
      select: rowSelect,
    }),
    db.enquiry.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    db.enquiry.count(),
  ]);
  const by = (s: "NEW" | "CONTACTED" | "CLOSED") =>
    grouped.find((g) => g.status === s)?._count._all ?? 0;
  const counts = {
    new: by("NEW"),
    contacted: by("CONTACTED"),
    closed: by("CLOSED"),
    all: 0,
  };
  counts.all = counts.new + counts.contacted + counts.closed;
  return {
    rows,
    total: counts[f.status],
    counts,
    page: f.page,
    pageSize: ENQUIRIES_PAGE_SIZE,
    inboxEmpty: everything === 0,
  };
}

export type EnquiryDetail = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interest: EnquiryRow["interest"];
  source: EnquiryRow["source"];
  status: EnquiryRow["status"];
  message: string;
  note: string | null;
  wantsInspection: boolean;
  amountKobo: bigint | null;
  createdAt: Date;
  property: { id: string; title: string; slug: string; published: boolean } | null;
  plan: { id: string; name: string; published: boolean } | null;
  /** Unit 17b: the plot chosen on an estate page. */
  plot: { name: string; priceKobo: bigint; initialDepositKobo: bigint | null } | null;
  /** Unit 17c: the package chosen on a plan page. */
  package: { name: string; summary: string } | null;
};

export async function getAdminEnquiry(id: string): Promise<EnquiryDetail | null> {
  await requireAdmin();
  const e = await db.enquiry.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, title: true, slug: true, status: true } },
      plan: { select: { id: true, name: true, status: true } },
      plot: { select: { label: true, sizeSqm: true, priceKobo: true, initialDepositKobo: true } },
      package: {
        select: { label: true, amountKobo: true, returnAmountKobo: true, tenureMonths: true },
      },
    },
  });
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    phone: e.phone,
    email: e.email,
    interest: e.interest,
    source: e.source,
    status: e.status,
    message: e.message,
    note: e.note,
    wantsInspection: e.wantsInspection,
    amountKobo: e.amountKobo,
    createdAt: e.createdAt,
    property: e.property
      ? {
          id: e.property.id,
          title: e.property.title,
          slug: e.property.slug,
          published: e.property.status === "PUBLISHED",
        }
      : null,
    plan: e.plan
      ? { id: e.plan.id, name: e.plan.name, published: e.plan.status === "PUBLISHED" }
      : null,
    plot: e.plot
      ? {
          name: plotName(e.plot),
          priceKobo: e.plot.priceKobo,
          initialDepositKobo: e.plot.initialDepositKobo,
        }
      : null,
    package: e.package
      ? { name: packageName(e.package), summary: packageSummary(e.package) }
      : null,
  };
}

/** Every enquiry matching the current filters (all pages), newest first, for the CSV. */
export async function exportAdminEnquiries(f: EnquiryFilters): Promise<CsvEnquiry[]> {
  await requireAdmin();
  const rows = await db.enquiry.findMany({
    where: statusWhere(f),
    orderBy: ORDER,
    take: CSV_MAX_ROWS,
    select: {
      createdAt: true,
      name: true,
      phone: true,
      email: true,
      interest: true,
      status: true,
      message: true,
      note: true,
      property: { select: { title: true } },
      plan: { select: { name: true } },
      plot: { select: { label: true, sizeSqm: true } },
      package: {
        select: { label: true, amountKobo: true, returnAmountKobo: true, tenureMonths: true },
      },
    },
  });
  return rows.map(({ property, plan, plot, package: pkg, ...r }) => ({
    ...r,
    propertyTitle: property
      ? plot
        ? `${property.title} — ${plotName(plot)}`
        : property.title
      : null,
    planName: plan ? (pkg ? `${plan.name} — ${packageName(pkg)}` : plan.name) : null,
  }));
}
