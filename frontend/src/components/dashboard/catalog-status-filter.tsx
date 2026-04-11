import type { CatalogStatus } from "@/types/api";
import { formatCatalogStatus, getCatalogStatusBadgeClassName } from "@/lib/catalog-lifecycle";
import { cn } from "@/lib/utils";

export type CatalogFilterValue = "all" | CatalogStatus;

const filterOptions: CatalogFilterValue[] = ["all", "published", "draft", "archived"];

const formatFilterLabel = (value: CatalogFilterValue) =>
  value === "all" ? "All" : formatCatalogStatus(value);

export function CatalogStatusFilter({
  value,
  onChange,
  counts,
  className
}: {
  value: CatalogFilterValue;
  onChange: (value: CatalogFilterValue) => void;
  counts: Record<CatalogStatus, number>;
  className?: string;
}) {
  const totalCount = counts.published + counts.draft + counts.archived;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="inline-flex flex-wrap gap-2 rounded-[24px] border border-white/10 bg-white/[0.03] p-1.5">
        {filterOptions.map((option) => {
          const isActive = value === option;
          const badgeClassName =
            option === "all"
              ? "border-white/10 bg-white/[0.04] text-slate-300"
              : getCatalogStatusBadgeClassName(option);
          const count = option === "all" ? totalCount : counts[option];

          return (
            <button
              key={option}
              type="button"
              className={cn(
                "focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition",
                isActive
                  ? "border-sky-300/22 bg-sky-300/[0.14] text-white shadow-[0_0_0_1px_rgba(125,211,252,0.12)]"
                  : "border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
              )}
              onClick={() => onChange(option)}
              aria-pressed={isActive}
            >
              <span>{formatFilterLabel(option)}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", badgeClassName)}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
        <span className="rounded-full border border-emerald-400/18 bg-emerald-400/[0.08] px-3 py-1 text-emerald-100">
          {counts.published} published
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-300">
          {counts.draft} drafts
        </span>
        <span className="rounded-full border border-amber-300/18 bg-amber-300/[0.08] px-3 py-1 text-amber-100">
          {counts.archived} archived
        </span>
      </div>
    </div>
  );
}
