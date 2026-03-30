import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeDollarSign,
  CalendarClock,
  LoaderCircle,
  PencilLine,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  X
} from "lucide-react";
import { deleteLicense, fetchLicenseById, updateLicense } from "@/services/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Asset, License, Purchase } from "@/types/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LicenseDetailDrawer({
  licenseId,
  assets,
  purchases,
  isDeleting,
  onClose,
  onDeleteRequest,
  onLicenseUpdated
}: {
  licenseId: number | null;
  assets: Asset[];
  purchases: Purchase[];
  isDeleting?: boolean;
  onClose: () => void;
  onDeleteRequest: (license: License) => void;
  onLicenseUpdated: (license: License) => void;
}) {
  const [license, setLicense] = useState<License | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState("");
  const [usage, setUsage] = useState("");
  const [price, setPrice] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!licenseId) {
      setLicense(null);
      setError(null);
      setIsEditing(false);
      setSaveFeedback(null);
      setSaveError(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [licenseId, onClose]);

  useEffect(() => {
    if (!licenseId) {
      return;
    }

    let cancelled = false;

    const loadLicense = async () => {
      try {
        setLoading(true);
        setError(null);
        setSaveFeedback(null);
        setSaveError(null);
        const nextLicense = await fetchLicenseById(licenseId);
        if (cancelled) {
          return;
        }
        setLicense(nextLicense);
        setType(nextLicense.type);
        setUsage(nextLicense.usage);
        setPrice(String(nextLicense.price));
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setLicense(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load license");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLicense();

    return () => {
      cancelled = true;
    };
  }, [licenseId]);

  useEffect(() => {
    if (!saveFeedback && !saveError) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSaveFeedback(null);
      setSaveError(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [saveError, saveFeedback]);

  const linkedAsset = useMemo(
    () => (license ? assets.find((asset) => asset.id === license.assetId) || null : null),
    [assets, license]
  );

  const relatedPurchases = useMemo(
    () => (license ? purchases.filter((purchase) => purchase.licenseId === license.id) : []),
    [license, purchases]
  );

  if (!licenseId) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!license) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedLicense = await updateLicense(license.id, {
        type,
        usage,
        price: Number(price)
      });
      setLicense(updatedLicense);
      setType(updatedLicense.type);
      setUsage(updatedLicense.usage);
      setPrice(String(updatedLicense.price));
      setIsEditing(false);
      setSaveFeedback("License updated successfully.");
      onLicenseUpdated(updatedLicense);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update license"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close license detail"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 flex h-full w-full max-w-[620px] flex-col border-l border-white/10 bg-slate-950/95 shadow-[-30px_0_90px_rgba(2,8,23,0.55)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              License detail
            </p>
            <h3 className="mt-2 font-display text-2xl text-white">
              {loading ? "Loading license..." : license?.type || "License detail"}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {loading ? (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
                <div className="mt-4 h-8 w-48 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4"
                  >
                    <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.05]" />
                    <div className="mt-3 h-4 w-16 animate-pulse rounded-full bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/[0.05] p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-rose-200/70">
                License unavailable
              </p>
              <h4 className="mt-2 font-display text-2xl text-white">Unable to open license</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
              <div className="mt-5 flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : license ? (
            <div className="space-y-6">
              {saveFeedback ? <ActionFeedback tone="success" message={saveFeedback} /> : null}
              {saveError ? <ActionFeedback tone="error" message={saveError} /> : null}

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    License ID
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">#{license.id}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Asset
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {linkedAsset ? linkedAsset.title : `Asset #${license.assetId}`}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Purchases
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {relatedPurchases.length} recorded
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Created
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatDate(license.createdAt)}
                  </p>
                </div>
              </div>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-sky-200" />
                    <span className="text-sm font-medium">Rights package</span>
                  </div>
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => {
                        setIsEditing(true);
                        setType(license.type);
                        setUsage(license.usage);
                        setPrice(String(license.price));
                        setSaveError(null);
                      }}
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit license
                    </Button>
                  ) : null}
                </div>

                {!isEditing ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Type
                      </p>
                      <p className="mt-2 text-sm text-white">{license.type}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Usage
                      </p>
                      <p className="mt-2 text-sm text-white">{license.usage}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Price
                      </p>
                      <p className="mt-2 font-display text-2xl text-white">
                        {formatCurrency(Number(license.price))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Linked asset ID
                      </p>
                      <p className="mt-2 text-sm text-white">#{license.assetId}</p>
                    </div>
                  </div>
                ) : (
                  <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        License type
                      </label>
                      <Input
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Usage</label>
                      <Input
                        value={usage}
                        onChange={(event) => setUsage(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Price</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        required
                      />
                    </div>
                    {isSaving ? (
                      <ActionFeedback
                        tone="pending"
                        message="Saving license changes"
                        detail="The rights package is being updated against the live API."
                      />
                    ) : null}
                    <div className="flex items-center justify-end gap-3 border-t border-white/8 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setType(license.type);
                          setUsage(license.usage);
                          setPrice(String(license.price));
                          setSaveError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2" disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        {isSaving ? "Saving..." : "Save changes"}
                      </Button>
                    </div>
                  </form>
                )}
              </section>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShoppingCart className="h-4 w-4 text-sky-200" />
                  <span className="text-sm font-medium">Purchase relationship</span>
                </div>
                <div className="mt-4 rounded-[22px] border border-white/8 bg-slate-950/50 p-4">
                  <p className="text-sm leading-6 text-slate-300">
                    This rights package belongs to{" "}
                    <span className="font-medium text-white">
                      {linkedAsset ? linkedAsset.title : `Asset #${license.assetId}`}
                    </span>{" "}
                    and currently has{" "}
                    <span className="font-medium text-white">
                      {relatedPurchases.length} recorded purchases
                    </span>
                    .
                  </p>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        {license ? (
          <div className="border-t border-white/10 px-5 py-4 md:px-6">
            <div className="rounded-[24px] border border-rose-400/10 bg-rose-400/[0.04] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <BadgeDollarSign className="h-4 w-4 text-rose-200" />
                    <p className="text-sm font-medium">Delete license</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Deleting this license also removes linked purchases through the
                    existing database relationships.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 border-rose-400/20 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.14]"
                  onClick={() => onDeleteRequest(license)}
                  disabled={isDeleting || isSaving}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete license"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
