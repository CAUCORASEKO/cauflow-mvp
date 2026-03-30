import { ImageIcon } from "lucide-react";
import { getAssetImageUrl } from "@/services/api";
import type { Asset } from "@/types/api";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function AssetsGrid({ assets }: { assets: Asset[] }) {
  return (
    <div className="grid gap-4 xl:gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {assets.map((asset) => {
        const imageUrl = getAssetImageUrl(asset.imageUrl);

        return (
          <Card
            key={asset.id}
            tabIndex={0}
            className="surface-highlight group overflow-hidden border-white/8 bg-slate-950/50 hover:-translate-y-1 hover:border-white/15 hover:bg-slate-950/70 hover:shadow-[0_24px_55px_rgba(2,8,23,0.35)] focus-visible:border-sky-300/35 focus-visible:shadow-[0_0_0_1px_rgba(125,211,252,0.2),0_24px_55px_rgba(2,8,23,0.35)] focus-visible:outline-none"
          >
            <div className="relative aspect-[5/4] overflow-hidden border-b border-white/10 bg-slate-900">
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={asset.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
                Asset #{asset.id}
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <h3 className="line-clamp-1 font-display text-[1.35rem] font-semibold tracking-tight text-white">
                  {asset.title}
                </h3>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Added {formatDate(asset.createdAt)}
                </p>
              </div>
              <p className="min-h-[4.5rem] text-sm leading-6 text-slate-400">
                {asset.description || "No description provided."}
              </p>
              <div className="flex items-center justify-between border-t border-white/8 pt-3">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Visual preview
                </span>
                <span className="rounded-full border border-sky-300/15 bg-sky-300/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-100 transition-all duration-300 group-hover:border-sky-300/25 group-hover:bg-sky-300/12">
                  Inventory ready
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
