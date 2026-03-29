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
    <Card className="p-6">
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
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">{purchase.buyerEmail}</p>
                  <p className="text-sm text-slate-400">
                    License #{purchase.licenseId} {license ? `· ${license.type}` : ""}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-display text-xl text-white">
                    {license ? formatCurrency(Number(license.price)) : "N/A"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">
                    {purchase.status}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(purchase.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
