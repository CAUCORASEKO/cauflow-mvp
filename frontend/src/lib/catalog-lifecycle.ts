import type { CatalogStatus } from "@/types/api";

export const formatCatalogStatus = (value: string | null | undefined) => {
  const normalizedValue = (value || "draft").toLowerCase();

  if (normalizedValue === "published") {
    return "Published";
  }

  if (normalizedValue === "archived") {
    return "Archived";
  }

  return "Draft";
};

export const getCatalogStatusBadgeClassName = (status: CatalogStatus) => {
  if (status === "published") {
    return "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-100";
  }

  if (status === "archived") {
    return "border-amber-300/20 bg-amber-300/[0.1] text-amber-100";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
};

export const getCatalogStatusHelperCopy = (status: CatalogStatus, entityLabel: string) => {
  if (status === "published") {
    return `${entityLabel} is live in active marketplace and licensing flows.`;
  }

  if (status === "archived") {
    return `${entityLabel} is preserved for internal review and history, but hidden from new buyer activity.`;
  }

  return `${entityLabel} is hidden from marketplace while you refine or pause the offer.`;
};
