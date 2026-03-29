import type { Asset, License } from "@/types/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function LicenseList({
  licenses,
  assets
}: {
  licenses: License[];
  assets: Asset[];
}) {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset.title]));

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-white">Licenses</h3>
          <p className="text-sm text-slate-400">
            Structured rights available for purchase.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
          {licenses.length} total
        </span>
      </div>

      <div className="space-y-3">
        {licenses.map((license) => (
          <div
            key={license.id}
            className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-white">
                  {assetMap.get(license.assetId) || `Asset #${license.assetId}`}
                </p>
                <p className="text-sm text-slate-400">
                  {license.type} license for {license.usage}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="font-display text-xl text-white">
                  {formatCurrency(Number(license.price))}
                </p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Added {formatDate(license.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
