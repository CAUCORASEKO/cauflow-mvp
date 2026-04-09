import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarClock,
  CreditCard,
  LoaderCircle,
  Mail,
  PencilLine,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  X
} from "lucide-react";
import { deletePurchase, fetchPurchaseById, updatePurchase } from "@/services/api";
import { formatLicenseType } from "@/lib/license-taxonomy";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Asset, License, Purchase } from "@/types/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function PurchaseDetailDrawer({
  purchaseId,
  licenses,
  assets,
  isDeleting,
  onClose,
  onDeleteRequest,
  onPurchaseUpdated
}: {
  purchaseId: number | null;
  licenses: License[];
  assets: Asset[];
  isDeleting?: boolean;
  onClose: () => void;
  onDeleteRequest: (purchase: Purchase) => void;
  onPurchaseUpdated: (purchase: Purchase) => void;
}) {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [status, setStatus] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!purchaseId) {
      setPurchase(null);
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
  }, [purchaseId, onClose]);

  useEffect(() => {
    if (!purchaseId) {
      return;
    }

    let cancelled = false;

    const loadPurchase = async () => {
      try {
        setLoading(true);
        setError(null);
        setSaveFeedback(null);
        setSaveError(null);
        const nextPurchase = await fetchPurchaseById(purchaseId);
        if (cancelled) {
          return;
        }
        setPurchase(nextPurchase);
        setBuyerEmail(nextPurchase.buyerEmail);
        setStatus(nextPurchase.status);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setPurchase(null);
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load purchase"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPurchase();

    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

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

  const linkedLicense = useMemo(
    () =>
      purchase ? licenses.find((license) => license.id === purchase.licenseId) || null : null,
    [licenses, purchase]
  );

  const linkedAsset = useMemo(
    () =>
      linkedLicense
        ? assets.find((asset) => asset.id === linkedLicense.assetId) || null
        : null,
    [assets, linkedLicense]
  );

  if (!purchaseId) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!purchase) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedPurchase = await updatePurchase(purchase.id, { buyerEmail, status });
      setPurchase(updatedPurchase);
      setBuyerEmail(updatedPurchase.buyerEmail);
      setStatus(updatedPurchase.status);
      setIsEditing(false);
      setSaveFeedback("Purchase updated successfully.");
      onPurchaseUpdated(updatedPurchase);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update purchase"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close purchase detail"
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
              Purchase detail
            </p>
            <h3 className="mt-2 font-display text-2xl text-white">
              {loading ? "Loading purchase..." : purchase?.buyerEmail || "Purchase detail"}
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
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/[0.05] p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-rose-200/70">
                Purchase unavailable
              </p>
              <h4 className="mt-2 font-display text-2xl text-white">Unable to open purchase</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
              <div className="mt-5 flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : purchase ? (
            <div className="space-y-6">
              {saveFeedback ? <ActionFeedback tone="success" message={saveFeedback} /> : null}
              {saveError ? <ActionFeedback tone="error" message={saveError} /> : null}

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Purchase ID
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">#{purchase.id}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">{purchase.status}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    License
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    #{purchase.licenseId}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Created
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatDate(purchase.createdAt)}
                  </p>
                </div>
              </div>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CreditCard className="h-4 w-4 text-sky-200" />
                    <span className="text-sm font-medium">Transaction details</span>
                  </div>
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => {
                        setIsEditing(true);
                        setBuyerEmail(purchase.buyerEmail);
                        setStatus(purchase.status);
                        setSaveError(null);
                      }}
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit purchase
                    </Button>
                  ) : null}
                </div>

                {!isEditing ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Buyer email
                      </p>
                      <p className="mt-2 text-sm text-white">{purchase.buyerEmail}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Represented amount
                      </p>
                      <p className="mt-2 font-display text-2xl text-white">
                        {linkedLicense ? formatCurrency(Number(linkedLicense.price)) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Linked license
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {linkedLicense
                          ? `${formatLicenseType(linkedLicense.type)} · #${linkedLicense.id}`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Linked asset
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {linkedAsset ? `${linkedAsset.title} · #${linkedAsset.id}` : "N/A"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Buyer email
                      </label>
                      <Input
                        type="email"
                        value={buyerEmail}
                        onChange={(event) => setBuyerEmail(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Status</label>
                      <Select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                      >
                        <option value="completed">completed</option>
                        <option value="pending">pending</option>
                        <option value="refunded">refunded</option>
                      </Select>
                    </div>
                    {isSaving ? (
                      <ActionFeedback
                        tone="pending"
                        message="Saving purchase changes"
                        detail="The transaction is being updated against the live API."
                      />
                    ) : null}
                    <div className="flex items-center justify-end gap-3 border-t border-white/8 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setBuyerEmail(purchase.buyerEmail);
                          setStatus(purchase.status);
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
                  <Mail className="h-4 w-4 text-sky-200" />
                  <span className="text-sm font-medium">Relationship context</span>
                </div>
                <div className="mt-4 rounded-[22px] border border-white/8 bg-slate-950/50 p-4">
                  <p className="text-sm leading-6 text-slate-300">
                    This purchase belongs to{" "}
                    <span className="font-medium text-white">
                      {linkedLicense
                        ? `${formatLicenseType(linkedLicense.type)} · #${linkedLicense.id}`
                        : "an unavailable license"}
                    </span>
                    {linkedAsset ? (
                      <>
                        {" "}
                        for{" "}
                        <span className="font-medium text-white">
                          {linkedAsset.title}
                        </span>
                        .
                      </>
                    ) : (
                      "."
                    )}
                  </p>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        {purchase ? (
          <div className="border-t border-white/10 px-5 py-4 md:px-6">
            <div className="rounded-[24px] border border-rose-400/10 bg-rose-400/[0.04] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <ShoppingCart className="h-4 w-4 text-rose-200" />
                    <p className="text-sm font-medium">Delete purchase</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Remove this transaction record from the commercial trail.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 border-rose-400/20 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.14]"
                  onClick={() => onDeleteRequest(purchase)}
                  disabled={isDeleting || isSaving}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete purchase"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
