import { Eye, PencilLine, Trash2 } from "lucide-react";
import type { Asset, License, Purchase } from "@/types/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function LicenseList({
  licenses,
  assets,
  purchases,
  selectedLicenseId,
  onSelectLicense,
  onDeleteLicense
}: {
  licenses: License[];
  assets: Asset[];
  purchases: Purchase[];
  selectedLicenseId: number | null;
  onSelectLicense: (license: License) => void;
  onDeleteLicense: (license: License) => void;
}) {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset.title]));
  const purchaseCountByLicenseId = new Map<number, number>();

  for (const purchase of purchases) {
    purchaseCountByLicenseId.set(
      purchase.licenseId,
      (purchaseCountByLicenseId.get(purchase.licenseId) || 0) + 1
    );
  }

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
        {licenses.map((license) => {
          const isSelected = selectedLicenseId === license.id;
          const purchaseCount = purchaseCountByLicenseId.get(license.id) || 0;

          return (
          <div
            key={license.id}
            tabIndex={0}
            className={`surface-highlight rounded-[24px] border p-4 transition-all duration-200 focus-visible:outline-none ${
              isSelected
                ? "border-sky-300/24 bg-sky-300/[0.06] shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_18px_40px_rgba(2,8,23,0.22)]"
                : "border-white/8 bg-white/[0.025] hover:-translate-y-px hover:border-white/14 hover:bg-white/[0.04] hover:shadow-[0_18px_40px_rgba(2,8,23,0.2)] focus-visible:border-sky-300/30 focus-visible:bg-white/[0.04]"
            }`}
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
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {purchaseCount} purchases linked
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-sky-100 transition hover:bg-sky-300/14"
                    onClick={() => onSelectLicense(license)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Detail
                  </button>
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08]"
                    onClick={() => onSelectLicense(license)}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-rose-400/15 bg-rose-400/[0.05] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-400/[0.12]"
                    onClick={() => onDeleteLicense(license)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>
    </Card>
  );
}
