import { Check, ImageIcon, Star } from "lucide-react";
import { getAssetImageUrl } from "@/services/api";
import type { Asset } from "@/types/api";
import { cn } from "@/lib/utils";

export function PackAssetPicker({
  assets,
  selectedAssetIds,
  coverAssetId,
  onToggleAsset,
  onSelectCover,
  error,
  framed = true
}: {
  assets: Asset[];
  selectedAssetIds: number[];
  coverAssetId: number | null;
  onToggleAsset: (assetId: number) => void;
  onSelectCover: (assetId: number) => void;
  error?: string | null;
  framed?: boolean;
}) {
  return (
    <section
      className={cn(
        framed
          ? "rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          : "min-w-0"
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300/80">
            Included assets
          </p>
          <h4 className="mt-2 font-display text-[1.35rem] font-medium tracking-tight text-white">
            Build the pack lineup
          </h4>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Select the assets that belong in this commercial bundle and mark one of the
            selected visuals as the cover.
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-sm font-medium text-slate-200">
          {selectedAssetIds.length} selected
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-black/20 px-4 py-6 text-sm leading-6 text-slate-300">
          Upload or create assets first. The pack builder uses existing inventory items
          as the contents and cover for the product bundle.
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {assets.map((asset) => {
          const isSelected = selectedAssetIds.includes(asset.id);
          const isCover = coverAssetId === asset.id;
          const imageUrl = getAssetImageUrl(asset.imageUrl);

          return (
            <div
              key={asset.id}
              className={cn(
                "grid min-w-0 grid-rows-[auto,1fr,auto] overflow-hidden rounded-[24px] border bg-slate-950/60 p-3 transition-all duration-200",
                isSelected
                  ? "border-sky-300/24 bg-sky-300/[0.07] shadow-[0_18px_40px_rgba(14,165,233,0.08)]"
                  : "border-white/8"
              )}
            >
              <div className="min-w-0">
                <div className="overflow-hidden rounded-[18px] border border-white/10 bg-slate-900">
                  <button
                    type="button"
                    className="focus-ring block h-full w-full"
                    onClick={() => onToggleAsset(asset.id)}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={asset.title}
                        className="aspect-[4/3] h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="min-w-0 px-1 pb-1 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      isSelected
                        ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
                    )}
                  >
                    {isSelected ? "Included" : "Available"}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
                    Asset #{asset.id}
                  </span>
                  {isCover ? (
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.1] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      Cover
                    </span>
                  ) : null}
                </div>

                <h5 className="mt-3 line-clamp-1 text-base font-semibold text-white">
                  {asset.title}
                </h5>
                <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-300">
                  {asset.description || "No description available."}
                </p>
              </div>

              <div className="mt-4 grid min-w-0 gap-2 border-t border-white/8 pt-4">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggleAsset(asset.id)}
                  className={cn(
                    "focus-ring inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                    isSelected
                      ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.12]"
                      : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]"
                  )}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                  {isSelected ? "Included" : "Include"}
                </button>
                <button
                  type="button"
                  aria-pressed={isCover}
                  onClick={() => onSelectCover(asset.id)}
                  disabled={!isSelected}
                  className={cn(
                    "focus-ring inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
                    isSelected
                      ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.12]"
                      : "cursor-not-allowed border-white/8 bg-white/[0.02] text-slate-600"
                  )}
                >
                  <Star className="h-3.5 w-3.5" />
                  {isCover ? "Cover selected" : "Set as cover"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-rose-300">{error}</p> : null}
    </section>
  );
}
