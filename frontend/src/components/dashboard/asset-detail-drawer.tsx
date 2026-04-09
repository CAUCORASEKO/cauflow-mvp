import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  FileImage,
  LoaderCircle,
  PencilLine,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { fetchAssetById, getAssetImageUrl, updateAsset } from "@/services/api";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Asset, License, Purchase } from "@/types/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AssetDetailDrawer({
  assetId,
  licenses,
  purchases,
  isDeleting,
  onClose,
  onDeleteRequest,
  onAssetUpdated
}: {
  assetId: number | null;
  licenses: License[];
  purchases: Purchase[];
  isDeleting?: boolean;
  onClose: () => void;
  onDeleteRequest: (asset: Asset) => void;
  onAssetUpdated: (asset: Asset) => void;
}) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [replacementImage, setReplacementImage] = useState<File | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      setError(null);
      setIsEditing(false);
      setReplacementImage(null);
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
  }, [assetId, onClose]);

  useEffect(() => {
    if (!assetId) {
      return;
    }

    let cancelled = false;

    const loadAsset = async () => {
      try {
        setLoading(true);
        setError(null);
        setSaveFeedback(null);
        setSaveError(null);
        const nextAsset = await fetchAssetById(assetId);
        if (cancelled) {
          return;
        }
        setAsset(nextAsset);
        setTitle(nextAsset.title);
        setDescription(nextAsset.description || "");
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setAsset(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load asset");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAsset();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

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

  const replacementPreview = useMemo(() => {
    if (!replacementImage) {
      return null;
    }

    return URL.createObjectURL(replacementImage);
  }, [replacementImage]);

  useEffect(() => {
    return () => {
      if (replacementPreview) {
        URL.revokeObjectURL(replacementPreview);
      }
    };
  }, [replacementPreview]);

  const relatedLicenses = useMemo(
    () => (asset ? licenses.filter((license) => license.assetId === asset.id) : []),
    [asset, licenses]
  );

  const relatedPurchaseCount = useMemo(
    () =>
      purchases.filter((purchase) =>
        relatedLicenses.some((license) => license.id === purchase.licenseId)
      ).length,
    [purchases, relatedLicenses]
  );

  if (!assetId) {
    return null;
  }

  const imageUrl = getAssetImageUrl(asset?.imageUrl || null);
  const activeImagePreview = replacementPreview || imageUrl;

  const handleRetry = () => {
    setAsset(null);
    setError(null);
    setLoading(false);
    setSaveFeedback(null);
    setSaveError(null);
    setIsEditing(false);
    setReplacementImage(null);
    if (assetId) {
      setLoading(true);
      void fetchAssetById(assetId)
        .then((nextAsset) => {
          setAsset(nextAsset);
          setTitle(nextAsset.title);
          setDescription(nextAsset.description || "");
        })
        .catch((loadError) => {
          setAsset(null);
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load asset"
          );
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!asset) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedAsset = await updateAsset(asset.id, {
        title,
        description,
        image: replacementImage
      });
      setAsset(updatedAsset);
      setTitle(updatedAsset.title);
      setDescription(updatedAsset.description || "");
      setReplacementImage(null);
      setIsEditing(false);
      setSaveFeedback("Asset metadata updated successfully.");
      onAssetUpdated(updatedAsset);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update asset"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close asset detail"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 flex h-full w-full max-w-[640px] flex-col border-l border-white/10 bg-slate-950/95 shadow-[-30px_0_90px_rgba(2,8,23,0.55)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Asset detail
            </p>
            <h3 className="mt-2 font-display text-2xl text-white">
              {loading ? "Loading asset..." : asset?.title || "Asset detail"}
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
              <div className="aspect-[16/10] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.04]" />
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
                Asset unavailable
              </p>
              <h4 className="mt-2 font-display text-2xl text-white">Unable to open asset</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
              <div className="mt-5 flex items-center gap-3">
                <Button type="button" variant="secondary" onClick={handleRetry}>
                  Retry
                </Button>
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : asset ? (
            <div className="space-y-6">
              {saveFeedback ? (
                <ActionFeedback tone="success" message={saveFeedback} />
              ) : null}
              {saveError ? <ActionFeedback tone="error" message={saveError} /> : null}

              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
                {activeImagePreview ? (
                  <img
                    src={activeImagePreview}
                    alt={asset.title}
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-slate-500">
                    <div className="text-center">
                      <FileImage className="mx-auto h-8 w-8" />
                      <p className="mt-3 text-sm">No preview uploaded</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Asset ID
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">#{asset.id}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Preview status
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {asset.imageUrl || replacementImage ? "Preview attached" : "Metadata only"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Licenses
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {relatedLicenses.length} linked
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Purchases
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {relatedPurchaseCount} recorded
                  </p>
                </div>
              </div>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Sparkles className="h-4 w-4 text-sky-200" />
                    <span className="text-sm font-medium">Metadata workspace</span>
                  </div>
                  {!isEditing ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => {
                        setIsEditing(true);
                        setTitle(asset.title);
                        setDescription(asset.description || "");
                        setReplacementImage(null);
                        setSaveError(null);
                      }}
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit asset
                    </Button>
                  ) : null}
                </div>

                {!isEditing ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Created
                      </p>
                      <p className="mt-2 text-sm text-white">{formatDate(asset.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Description
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        {asset.description || "No descriptive metadata has been added yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Asset title
                      </label>
                      <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Asset title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Description
                      </label>
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Add stronger catalog context for this asset."
                      />
                    </div>
                    <div className="space-y-3 rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Replace preview image
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            Optional. Keep the current preview if no new image is selected.
                          </p>
                        </div>
                        <label className="focus-ring cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white/[0.07]">
                          Choose image
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) =>
                              setReplacementImage(event.target.files?.[0] || null)
                            }
                          />
                        </label>
                      </div>
                      {replacementImage ? (
                        <p className="text-sm text-sky-100">
                          Selected: {replacementImage.name}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">No replacement image selected.</p>
                      )}
                    </div>

                    {isSaving ? (
                      <ActionFeedback
                        tone="pending"
                        message="Saving asset changes"
                        detail="Metadata is being updated against the live API."
                      />
                    ) : null}

                    <div className="flex items-center justify-end gap-3 border-t border-white/8 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setTitle(asset.title);
                          setDescription(asset.description || "");
                          setReplacementImage(null);
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
                  <ShieldCheck className="h-4 w-4 text-sky-200" />
                  <span className="text-sm font-medium">Related licenses</span>
                </div>
                <div className="mt-4 space-y-3">
                  {relatedLicenses.length > 0 ? (
                    relatedLicenses.map((license) => {
                      const purchaseCount = purchases.filter(
                        (purchase) => purchase.licenseId === license.id
                      ).length;

                      return (
                        <div
                          key={license.id}
                          className="rounded-[22px] border border-white/8 bg-slate-950/50 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white">
                                  {formatLicenseType(license.type)}
                                </p>
                                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                  #{license.id}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-400">
                                {formatLicenseUsage(license.usage)} usage
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="font-display text-xl text-white">
                                {formatCurrency(Number(license.price))}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                                {purchaseCount} purchases
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">
                      No licenses are linked to this asset yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-slate-400">Asset not found.</p>
            </div>
          )}
        </div>

        {asset ? (
          <div className="border-t border-white/10 px-5 py-4 md:px-6">
            <div className="rounded-[24px] border border-rose-400/10 bg-rose-400/[0.04] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <ShoppingCart className="h-4 w-4 text-rose-200" />
                    <p className="text-sm font-medium">Delete asset</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    CauFlow blocks deletion when this asset is already used by packs, licenses, or commercial history. Remove the dependency before deleting.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 border-rose-400/20 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.14]"
                  onClick={() => onDeleteRequest(asset)}
                  disabled={isDeleting || isSaving}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete asset"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
