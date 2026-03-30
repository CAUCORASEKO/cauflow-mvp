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
    <Card className="surface-highlight p-6">
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
            tabIndex={0}
            className="surface-highlight rounded-[24px] border border-white/8 bg-white/[0.025] p-4 transition-all duration-200 hover:-translate-y-px hover:border-white/14 hover:bg-white/[0.04] hover:shadow-[0_18px_40px_rgba(2,8,23,0.2)] focus-visible:border-sky-300/30 focus-visible:bg-white/[0.04] focus-visible:outline-none"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">
                    {assetMap.get(license.assetId) || `Asset #${license.assetId}`}
                  </p>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400 transition-colors duration-200">
                    #{license.id}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {license.type} license for {license.usage}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-left md:justify-end md:text-right">
                <span className="rounded-full border border-sky-300/15 bg-sky-300/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-sky-100">
                  Rights package
                </span>
                <div>
                  <p className="font-display text-xl text-white">
                    {formatCurrency(Number(license.price))}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Added {formatDate(license.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
