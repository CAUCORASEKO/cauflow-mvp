import { Eye, PencilLine, Trash2 } from "lucide-react";
import type { Asset, License, Purchase } from "@/types/api";
import { formatLicenseType } from "@/lib/license-taxonomy";
import { formatCurrency, formatDate, humanizeLabel } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function PurchaseList({
  purchases,
  licenses,
  assets,
  selectedPurchaseId,
  onSelectPurchase,
  onDeletePurchase
}: {
  purchases: Purchase[];
  licenses: License[];
  assets: Asset[];
  selectedPurchaseId: number | null;
  onSelectPurchase: (purchase: Purchase) => void;
  onDeletePurchase: (purchase: Purchase) => void;
}) {
  const licenseMap = new Map(licenses.map((license) => [license.id, license]));
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

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
          const asset =
            purchase.asset ||
            (license && license.sourceType === "asset"
              ? assetMap.get(license.sourceAssetId || license.assetId || -1)
              : null);
          const isSelected = selectedPurchaseId === purchase.id;

          return (
            <div
              key={purchase.id}
              tabIndex={0}
              className={`surface-highlight rounded-[24px] border p-4 transition-all duration-200 focus-visible:outline-none ${
                isSelected
                  ? "border-sky-300/24 bg-sky-300/[0.06] shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_18px_40px_rgba(2,8,23,0.22)]"
                  : "border-white/8 bg-white/[0.025] hover:-translate-y-px hover:border-white/14 hover:bg-white/[0.04] hover:shadow-[0_18px_40px_rgba(2,8,23,0.2)] focus-visible:border-sky-300/30 focus-visible:bg-white/[0.04]"
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-white">{purchase.buyerEmail}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    License #{purchase.licenseId} {license ? `· ${formatLicenseType(license.type)}` : ""}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {purchase.pack
                      ? `${purchase.pack.title} · Pack #${purchase.pack.id}`
                      : asset
                        ? `${asset.title} · Asset #${asset.id}`
                        : "Source unavailable"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-left md:justify-end md:text-right">
                  <p className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                    {humanizeLabel(purchase.paymentStatus || purchase.status)}
                  </p>
                  <div>
                    <p className="font-display text-xl text-white">
                      {license ? formatCurrency(Number(license.price)) : "N/A"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {formatDate(purchase.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-sky-100 transition hover:bg-sky-300/14"
                      onClick={() => onSelectPurchase(purchase)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detail
                    </button>
                    <button
                      type="button"
                      className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08]"
                      onClick={() => onSelectPurchase(purchase)}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="focus-ring inline-flex items-center gap-2 rounded-full border border-rose-400/15 bg-rose-400/[0.05] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-400/[0.12]"
                      onClick={() => onDeletePurchase(purchase)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
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
