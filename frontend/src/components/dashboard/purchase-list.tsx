import type { License, Purchase } from "@/types/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function PurchaseList({
  purchases,
  licenses
}: {
  purchases: Purchase[];
  licenses: License[];
}) {
  const licenseMap = new Map(licenses.map((license) => [license.id, license]));

  return (
    <Card className="surface-highlight p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-white">Purchases</h3>
          <p className="text-sm text-slate-400">
            Completed transactions against the current licensing catalog.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
          {purchases.length} total
        </span>
      </div>

      <div className="space-y-3">
        {purchases.map((purchase) => {
          const license = licenseMap.get(purchase.licenseId);

          return (
            <div
              key={purchase.id}
              tabIndex={0}
              className="surface-highlight rounded-[24px] border border-white/8 bg-white/[0.025] p-4 transition-all duration-200 hover:-translate-y-px hover:border-white/14 hover:bg-white/[0.04] hover:shadow-[0_18px_40px_rgba(2,8,23,0.2)] focus-visible:border-sky-300/30 focus-visible:bg-white/[0.04] focus-visible:outline-none"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">{purchase.buyerEmail}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    License #{purchase.licenseId} {license ? `· ${license.type}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-left md:justify-end md:text-right">
                  <p className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                    {purchase.status}
                  </p>
                  <div>
                    <p className="font-display text-xl text-white">
                      {license ? formatCurrency(Number(license.price)) : "N/A"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {formatDate(purchase.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
