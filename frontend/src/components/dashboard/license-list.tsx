import { Eye, PencilLine, Trash2 } from "lucide-react";
import type { Asset, License, Pack, Purchase } from "@/types/api";
import {
  formatLicenseSourceType,
  formatLicenseType,
  formatLicenseUsage
} from "@/lib/license-taxonomy";
import { getLicensePolicyBadges, getLicensePolicyInput } from "@/lib/license-policy";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatCatalogStatus, getCatalogStatusBadgeClassName } from "@/lib/catalog-lifecycle";
import { formatOfferClass, getOfferClassBadgeClassName } from "@/lib/offer-class";

export function LicenseList({
  licenses,
  assets,
  packs,
  purchases,
  selectedLicenseId,
  statusActionLicenseId,
  onSelectLicense,
  onStatusAction,
  onDeleteLicense
}: {
  licenses: License[];
  assets: Asset[];
  packs: Pack[];
  purchases: Purchase[];
  selectedLicenseId: number | null;
  statusActionLicenseId: number | null;
  onSelectLicense: (license: License) => void;
  onStatusAction: (license: License) => void;
  onDeleteLicense: (license: License) => void;
}) {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset.title]));
  const packMap = new Map(packs.map((pack) => [pack.id, pack.title]));
  const purchaseCountByLicenseId = new Map<number, number>();

  for (const purchase of purchases) {
    purchaseCountByLicenseId.set(
      purchase.licenseId,
      (purchaseCountByLicenseId.get(purchase.licenseId) || 0) + 1
    );
  }

  return (
    <div className="space-y-3">
      {licenses.map((license) => {
        const isSelected = selectedLicenseId === license.id;
        const isUpdatingStatus = statusActionLicenseId === license.id;
        const purchaseCount = purchaseCountByLicenseId.get(license.id) || 0;
        const sourceTitle =
          license.sourceTitle ||
          (license.sourceType === "pack"
            ? license.sourcePack?.title || packMap.get(license.sourcePackId || -1)
            : license.sourceAsset?.title || assetMap.get(license.sourceAssetId || -1)) ||
          `${formatLicenseSourceType(license.sourceType)} #${
            license.sourceType === "pack" ? license.sourcePackId : license.sourceAssetId
          }`;
        const policyBadges = license.policy
          ? getLicensePolicyBadges(getLicensePolicyInput(license.policy)).slice(0, 3)
          : [];
        const quickActionLabel =
          license.status === "published"
            ? "Unpublish"
            : license.status === "archived"
              ? "Restore"
              : "Publish";
        const quickActionClassName =
          license.status === "published"
            ? "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
            : license.status === "archived"
              ? "border-amber-300/15 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.12]"
              : "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.12]";

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
                    {sourceTitle}
                  </p>
                  <span className="rounded-full border border-sky-300/15 bg-sky-300/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-100">
                    {formatLicenseSourceType(license.sourceType)}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400 transition-colors duration-200">
                    #{license.id}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getOfferClassBadgeClassName(
                      license.offerClass
                    )}`}
                  >
                    {formatOfferClass(license.offerClass)}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                      license.status
                    )}`}
                  >
                    {formatCatalogStatus(license.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {formatLicenseType(license.type)} license for {formatLicenseUsage(license.usage)}
                </p>
                {policyBadges.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {policyBadges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-sky-300/15 bg-sky-300/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-100"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    No policy configured
                  </p>
                )}
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {purchaseCount} purchases linked
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-left md:justify-end md:text-right">
                <span
                  className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                    license.status
                  )}`}
                >
                  {formatCatalogStatus(license.status)}
                </span>
                <div>
                  <p className="font-display text-xl text-white">
                    {license.offerClass === "free_use"
                      ? "Free"
                      : formatCurrency(Number(license.price))}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Added {formatDate(license.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${quickActionClassName}`}
                    onClick={() => onStatusAction(license)}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? "Updating..." : quickActionLabel}
                  </button>
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
        );
      })}
    </div>
  );
}
