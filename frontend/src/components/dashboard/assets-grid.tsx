import { ImageIcon } from "lucide-react";
import { getAssetImageUrl } from "@/services/api";
import type { Asset } from "@/types/api";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function AssetsGrid({ assets }: { assets: Asset[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => {
        const imageUrl = getAssetImageUrl(asset.imageUrl);

        return (
          <Card key={asset.id} className="overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10 bg-slate-900">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={asset.title}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-xl font-semibold text-white">
                  {asset.title}
                </h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                  #{asset.id}
                </span>
              </div>
              <p className="min-h-[4.5rem] text-sm leading-6 text-slate-400">
                {asset.description || "No description provided."}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Added {formatDate(asset.createdAt)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
