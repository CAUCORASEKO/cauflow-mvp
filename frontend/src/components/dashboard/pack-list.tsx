import { Eye, ImageIcon, PencilLine, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatLicenseType } from "@/lib/license-taxonomy";
import { getAssetImageUrl } from "@/services/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Pack } from "@/types/api";
import { formatPackCategory, formatVisualAssetType } from "@/lib/visual-taxonomy";

const statusClassName: Record<Pack["status"], string> = {
  draft: "border-white/10 bg-white/[0.04] text-slate-300",
  published: "border-emerald-400/20 bg-emerald-400/[0.1] text-emerald-100"
};

export function PackList({
  packs,
  selectedPackId,
  onSelectPack,
  onDeletePack
}: {
  packs: Pack[];
  selectedPackId: number | null;
  onSelectPack: (pack: Pack) => void;
  onDeletePack: (pack: Pack) => void;
}) {
  return (
    <div className="space-y-3">
      {packs.map((pack) => {
        const imageUrl = getAssetImageUrl(pack.coverAsset?.imageUrl || null);
        const isSelected = selectedPackId === pack.id;

        return (
          <Card
            key={pack.id}
            className={cn(
              "surface-highlight overflow-hidden border-white/8 bg-slate-950/55 p-0 hover:border-white/14 hover:bg-slate-950/65",
              isSelected
                ? "border-sky-300/24 bg-sky-300/[0.06] shadow-[0_0_0_1px_rgba(125,211,252,0.12)]"
                : ""
            )}
          >
            <div className="grid gap-4 p-4 md:grid-cols-[160px,minmax(0,1fr),auto] md:items-center">
              <button
                type="button"
                className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 text-left"
                onClick={() => onSelectPack(pack)}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={pack.title}
                    className="aspect-[5/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[5/4] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                )}
              </button>

              <button
                type="button"
                className="min-w-0 text-left"
                onClick={() => onSelectPack(pack)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="line-clamp-1 font-display text-[1.5rem] text-white">
                    {pack.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      statusClassName[pack.status]
                    )}
                  >
                    {pack.status}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
                    {formatPackCategory(pack.category)}
                  </span>
                  {pack.coverAsset?.visualType ? (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
                      {formatVisualAssetType(pack.coverAsset.visualType)}
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
                  {pack.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-300/75">
                  <span>{pack.assetCount} assets</span>
                  <span>{formatCurrency(Number(pack.price))}</span>
                  <span>
                    {pack.license
                      ? `${formatLicenseType(pack.license.type)} license`
                      : "No base license"}
                  </span>
                  <span>Updated {formatDate(pack.updatedAt)}</span>
                </div>
              </button>

              <div className="flex flex-col items-start gap-2 md:items-end">
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/[0.12] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-50 transition hover:bg-sky-300/[0.16]"
                  onClick={() => onSelectPack(pack)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Detail
                </button>
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/[0.08]"
                  onClick={() => onSelectPack(pack)}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-rose-400/15 bg-rose-400/[0.05] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-400/[0.12]"
                  onClick={() => onDeletePack(pack)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
