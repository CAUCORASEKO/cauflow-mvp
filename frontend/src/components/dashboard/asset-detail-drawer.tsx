import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  FileImage,
  FolderUp,
  LoaderCircle,
  PencilLine,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stamp,
  Trash2,
  X
} from "lucide-react";
import {
  fetchAssetById,
  getAssetImageUrl,
  submitAssetForReview,
  updateAsset,
  updateAssetReview
} from "@/services/api";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import {
  assetDeliveryRulesCopy,
  assetDeliveryStandards,
  formatAssetDeliveryStatus,
  getAssetDeliveryBadgeClassName,
  getAssetFileMetaRows,
  getAssetPreviewUrl,
  getAssetPrimaryReadinessNote
} from "@/lib/asset-delivery";
import { formatCurrency, formatDate, formatFileSize } from "@/lib/utils";
import type { Asset, AssetFileRecord, License, Purchase } from "@/types/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { FormSection } from "@/components/dashboard/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCatalogStatus,
  getCatalogStatusBadgeClassName,
  getCatalogStatusHelperCopy
} from "@/lib/catalog-lifecycle";
import {
  formatOfferClass,
  getOfferClassBadgeClassName,
  getOfferClassDescription
} from "@/lib/offer-class";
import {
  formatAssetReviewStatus,
  getAssetPublicationSummary,
  getAssetPublishGateCopy,
  getCreatorAssetReviewPresentation,
  getAssetReviewHelperCopy
} from "@/lib/asset-review";
import { formatVisualAssetType, visualAssetTypeOptions } from "@/lib/visual-taxonomy";

const reviewWorkflowStates = [
  ["Draft", "This asset is still being prepared for review."],
  ["In review", "This asset is currently under premium catalog review."],
  ["Approved", "This asset has passed review and is eligible for publication."],
  ["Rejected", "This asset needs changes before it can enter the premium catalog."]
] as const;

const freeUseLifecycleStates = [
  ["Draft", "Hidden from buyers until you publish the free-use offer."],
  ["Published", "Visible to buyers in Explore without premium review or premium delivery gating."],
  ["Archived", "Removed from Explore while preserving the free-use offer record."]
] as const;

const getNextWorkflowAction = (asset: Asset) => {
  if (asset.status === "published" && asset.canPublish) {
    return "Currently live in marketplace";
  }

  if (asset.offerClass === "free_use") {
    return asset.canPublish ? "Publish free-use offer" : "Add preview access";
  }

  if (!asset.deliveryReadiness?.isReady) {
    return "Resolve delivery fixes";
  }

  if (asset.reviewStatus === "draft" || asset.reviewStatus === "rejected") {
    return "Submit for review";
  }

  if (asset.reviewStatus === "in_review") {
    return "Await review decision";
  }

  if (asset.canPublish) {
    return "Publish asset";
  }

  return "Review asset detail";
};

function GuidanceCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
    </div>
  );
}

function AssetFileCard({
  label,
  helper,
  file,
  fallback,
  ctaLabel,
  onChange
}: {
  label: string;
  helper: string;
  file: AssetFileRecord | null | undefined;
  fallback: string;
  ctaLabel?: string;
  onChange?: (file: File | null) => void;
}) {
  const metaRows = getAssetFileMetaRows(file);

  return (
    <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-sm font-medium text-white">
            {file?.fileName || fallback}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{helper}</p>
        </div>
        {onChange && ctaLabel ? (
          <label className="focus-ring cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-white/[0.07]">
            {ctaLabel}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => onChange(event.target.files?.[0] || null)}
            />
          </label>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
          {file?.fileSize ? formatFileSize(file.fileSize) : "Metadata pending"}
        </span>
        {metaRows.map((row) => (
          <span
            key={row}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400"
          >
            {row}
          </span>
        ))}
      </div>
    </div>
  );
}

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
  const [visualType, setVisualType] = useState<Asset["visualType"]>("photography");
  const [offerClass, setOfferClass] = useState<Asset["offerClass"]>("premium");
  const [status, setStatus] = useState<Asset["status"]>("published");
  const [reviewNote, setReviewNote] = useState("");
  const [replacementPreviewImage, setReplacementPreviewImage] = useState<File | null>(null);
  const [replacementMasterFile, setReplacementMasterFile] = useState<File | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      setError(null);
      setIsEditing(false);
      setReviewNote("");
      setReplacementPreviewImage(null);
      setReplacementMasterFile(null);
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
        setVisualType(nextAsset.visualType);
        setOfferClass(nextAsset.offerClass);
        setStatus(nextAsset.status);
        setReviewNote(nextAsset.reviewNote || "");
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

  const replacementPreviewUrl = useMemo(
    () =>
      replacementPreviewImage ? URL.createObjectURL(replacementPreviewImage) : null,
    [replacementPreviewImage]
  );

  useEffect(
    () => () => {
      if (replacementPreviewUrl) {
        URL.revokeObjectURL(replacementPreviewUrl);
      }
    },
    [replacementPreviewUrl]
  );

  const relatedLicenses = useMemo(
    () =>
      asset
        ? licenses.filter(
            (license) =>
              license.sourceType === "asset" &&
              (license.sourceAssetId || license.assetId) === asset.id
          )
        : [],
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

  const basePreviewUrl = asset ? getAssetPreviewUrl(asset) : null;
  const activeImagePreview = replacementPreviewUrl || getAssetImageUrl(basePreviewUrl);
  const readinessStatus = asset?.deliveryReadiness?.status;
  const readinessNotes = asset?.deliveryReadiness?.notes || [];
  const reviewStatus = asset?.reviewStatus;
  const reviewHelperCopy = asset ? getAssetReviewHelperCopy(asset) : "";
  const publishGateCopy = asset ? getAssetPublishGateCopy(asset) : "";
  const publishBlockedReasons = asset?.publishBlockedReasons || [];
  const nextWorkflowAction = asset ? getNextWorkflowAction(asset) : "";
  const publicationDecisionState = asset ? getAssetPublicationSummary(asset) : null;
  const creatorReviewPresentation = asset ? getCreatorAssetReviewPresentation(asset) : null;
  const canSubmitForReview =
    asset?.offerClass === "premium" &&
    Boolean(asset?.deliveryReadiness?.isReady) &&
    (reviewStatus === "draft" || reviewStatus === "rejected");
  const previewDraftFile = replacementPreviewImage
    ? {
        fileName: replacementPreviewImage.name,
        fileSize: replacementPreviewImage.size,
        mimeType: replacementPreviewImage.type,
        url: null,
        width: null,
        height: null,
        aspectRatio: null,
        resolutionSummary: null
      }
    : asset?.previewFile;
  const masterDraftFile = replacementMasterFile
    ? {
        fileName: replacementMasterFile.name,
        fileSize: replacementMasterFile.size,
        mimeType: replacementMasterFile.type,
        url: null,
        width: null,
        height: null,
        aspectRatio: null,
        resolutionSummary: null
      }
    : asset?.masterFile;

  const handleRetry = () => {
    setAsset(null);
    setError(null);
    setLoading(false);
    setSaveFeedback(null);
    setSaveError(null);
    setIsEditing(false);
    setReplacementPreviewImage(null);
    setReplacementMasterFile(null);
    if (assetId) {
      setLoading(true);
      void fetchAssetById(assetId)
        .then((nextAsset) => {
          setAsset(nextAsset);
          setTitle(nextAsset.title);
          setDescription(nextAsset.description || "");
          setVisualType(nextAsset.visualType);
          setOfferClass(nextAsset.offerClass);
          setStatus(nextAsset.status);
          setReviewNote(nextAsset.reviewNote || "");
        })
        .catch((loadError) => {
          setAsset(null);
          setError(loadError instanceof Error ? loadError.message : "Unable to load asset");
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
        visualType,
        offerClass,
        status,
        previewImage: replacementPreviewImage,
        masterFile: replacementMasterFile
      });
      setAsset(updatedAsset);
      setTitle(updatedAsset.title);
      setDescription(updatedAsset.description || "");
      setVisualType(updatedAsset.visualType);
      setOfferClass(updatedAsset.offerClass);
      setStatus(updatedAsset.status);
      setReviewNote(updatedAsset.reviewNote || "");
      setReplacementPreviewImage(null);
      setReplacementMasterFile(null);
      setIsEditing(false);
      setSaveFeedback("Asset saved successfully.");
      onAssetUpdated(updatedAsset);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error ? submissionError.message : "Unable to update asset"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus: Asset["status"]) => {
    if (!asset || nextStatus === asset.status) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedAsset = await updateAsset(asset.id, {
        title: asset.title,
        description: asset.description || "",
        visualType: asset.visualType,
        offerClass: asset.offerClass,
        status: nextStatus
      });
      setAsset(updatedAsset);
      setTitle(updatedAsset.title);
      setDescription(updatedAsset.description || "");
      setVisualType(updatedAsset.visualType);
      setOfferClass(updatedAsset.offerClass);
      setStatus(updatedAsset.status);
      setReviewNote(updatedAsset.reviewNote || "");
      setSaveFeedback(
        nextStatus === "published"
          ? "Asset published successfully."
          : nextStatus === "draft"
            ? "Asset moved back to draft."
            : `Asset moved to ${formatCatalogStatus(nextStatus).toLowerCase()}.`
      );
      onAssetUpdated(updatedAsset);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update asset lifecycle"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!asset) {
      return;
    }

    try {
      setIsSubmittingReview(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedAsset = await submitAssetForReview(asset.id);
      setAsset(updatedAsset);
      setStatus(updatedAsset.status);
      setReviewNote(updatedAsset.reviewNote || "");
      setSaveFeedback("Asset submitted for review.");
      onAssetUpdated(updatedAsset);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit asset for review"
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewDecision = async (nextReviewStatus: Asset["reviewStatus"]) => {
    if (!asset) {
      return;
    }

    try {
      setIsUpdatingReview(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedAsset = await updateAssetReview(asset.id, {
        reviewStatus: nextReviewStatus,
        reviewNote
      });
      setAsset(updatedAsset);
      setStatus(updatedAsset.status);
      setReviewNote(updatedAsset.reviewNote || "");
      setSaveFeedback(
        nextReviewStatus === "approved"
          ? updatedAsset.status === "published"
            ? "Asset approved and remains published."
            : "Asset approved and ready for publication."
          : nextReviewStatus === "rejected"
            ? "Asset rejected. Review note saved."
            : "Asset moved back to draft."
      );
      onAssetUpdated(updatedAsset);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update asset review"
      );
    } finally {
      setIsUpdatingReview(false);
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
              {saveFeedback ? <ActionFeedback tone="success" message={saveFeedback} /> : null}
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

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Commercial state
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {publicationDecisionState?.detail || publishGateCopy}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${publicationDecisionState?.badgeClassName}`}
                    >
                      Commercial state: {publicationDecisionState?.pillLabel}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                        asset.status
                      )}`}
                    >
                      Catalog: {formatCatalogStatus(asset.status)}
                    </span>
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Offer class
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatOfferClass(asset.offerClass)}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getOfferClassBadgeClassName(
                      asset.offerClass
                    )}`}
                  >
                    {formatOfferClass(asset.offerClass)}
                  </span>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Review state
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">{reviewHelperCopy}</p>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${creatorReviewPresentation?.badgeClassName}`}
                  >
                    {creatorReviewPresentation?.label || formatAssetReviewStatus(reviewStatus)}
                  </span>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Premium readiness
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {getAssetPrimaryReadinessNote(asset)}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetDeliveryBadgeClassName(
                      readinessStatus
                    )}`}
                  >
                    {formatAssetDeliveryStatus(readinessStatus)}
                  </span>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Next action
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">{nextWorkflowAction}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <span>#{asset.id}</span>
                    <span>{formatVisualAssetType(asset.visualType)}</span>
                    <span>{relatedLicenses.length} licenses</span>
                    <span>{relatedPurchaseCount} purchases</span>
                  </div>
                </div>
              </div>

              <FormSection
                step="01"
                eyebrow="Asset Basics"
                title="Asset basics"
                description="Define the core identity and commercial positioning of this visual asset."
                aside={
                  !isEditing ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => {
                        setIsEditing(true);
                        setTitle(asset.title);
                        setDescription(asset.description || "");
                        setVisualType(asset.visualType);
                        setOfferClass(asset.offerClass);
                        setStatus(asset.status);
                        setReplacementPreviewImage(null);
                        setReplacementMasterFile(null);
                        setSaveError(null);
                      }}
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit asset
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Sparkles className="h-4 w-4 text-sky-200" />
                      <span className="text-sm font-medium">Editing asset</span>
                    </div>
                  )
                }
              >
                {!isEditing ? (
                  <div className="grid gap-4">
                    <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Asset title
                      </p>
                      <p className="mt-2 text-sm text-white">{asset.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Use a concise commercial title buyers can recognize easily.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Visual category
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {formatVisualAssetType(asset.visualType)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          This helps buyers understand the visual discipline of the asset in
                          marketplace and licensing surfaces.
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Commercial path
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {formatOfferClass(asset.offerClass)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {getOfferClassDescription(asset.offerClass)}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Created
                        </p>
                        <p className="mt-2 text-sm text-white">{formatDate(asset.createdAt)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          Asset #{asset.id}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        Licensing description
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        {asset.description || "No licensing description has been added yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Lifecycle</label>
                      <Select
                        value={status}
                        onChange={(event) => setStatus(event.target.value as Asset["status"])}
                        required
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </Select>
                      <p className="text-sm leading-6 text-slate-400">
                        {offerClass === "free_use"
                          ? "Free-use assets can be published with a preview file and do not wait on premium review or master-file readiness."
                          : "Only approved, delivery-ready premium assets are visible to buyers."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Commercial path</label>
                      <Select
                        value={offerClass}
                        onChange={(event) => setOfferClass(event.target.value as Asset["offerClass"])}
                        required
                      >
                        <option value="premium">Premium license</option>
                        <option value="free_use">Free-use offer</option>
                      </Select>
                      <p className="text-sm leading-6 text-slate-400">
                        Premium keeps review and delivery gates. Free-use remains zero-cost and never promises premium delivery.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Asset title</label>
                      <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Premium campaign stills"
                        required
                      />
                      <p className="text-sm leading-6 text-slate-400">
                        Use a concise commercial title buyers can recognize easily.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">Visual category</label>
                      <Select
                        value={visualType}
                        onChange={(event) =>
                          setVisualType(event.target.value as Asset["visualType"])
                        }
                        required
                      >
                        {visualAssetTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <p className="text-sm leading-6 text-slate-400">
                        This helps buyers understand the visual discipline of the asset in
                        marketplace and licensing surfaces.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Licensing description
                      </label>
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Describe the creative context and intended commercial value of this asset."
                      />
                      <p className="text-sm leading-6 text-slate-400">
                        Describe the creative context and intended commercial value of the asset.
                      </p>
                    </div>

                    {isSaving ? (
                      <ActionFeedback
                        tone="pending"
                        message="Saving asset..."
                        detail="Metadata, preview, and master delivery details are being updated against the live API."
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
                          setVisualType(asset.visualType);
                          setOfferClass(asset.offerClass);
                          setStatus(asset.status);
                          setReplacementPreviewImage(null);
                          setReplacementMasterFile(null);
                          setSaveError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-2" disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                        {isSaving ? "Saving asset..." : "Save changes"}
                      </Button>
                    </div>
                  </form>
                )}
              </FormSection>

              <FormSection
                step="02"
                eyebrow="Files"
                title="Files"
                description={
                  asset.offerClass === "free_use"
                    ? "The preview file represents the free-use asset access. A master file can still be stored internally, but it is not promised to free-use buyers."
                    : "Upload both the public preview and the premium delivery file. Buyers see the preview first, but licensed buyers unlock the master file after purchase."
                }
              >
                <div className="grid gap-4">
                  <AssetFileCard
                    label="Preview image"
                    helper="Shown in workspace and marketplace surfaces. Use a polished catalog-ready image that represents the asset clearly."
                    file={isEditing ? previewDraftFile : asset.previewFile}
                    fallback={isEditing ? "Keep existing preview image" : "No preview image uploaded"}
                    ctaLabel={isEditing ? (replacementPreviewImage ? "Replace preview" : "Choose preview") : undefined}
                    onChange={isEditing ? setReplacementPreviewImage : undefined}
                  />
                  <AssetFileCard
                    label="Master delivery file"
                    helper={
                      asset.offerClass === "free_use"
                        ? "Optional internal reference only. Free-use offers do not unlock premium master delivery."
                        : "Unlocked later for licensed buyers as the premium delivery file. Upload the final high-resolution version you want to deliver commercially after successful purchase."
                    }
                    file={isEditing ? masterDraftFile : asset.masterFile}
                    fallback={
                      isEditing
                        ? asset.offerClass === "free_use"
                          ? "Upload an optional internal master file"
                          : "Upload a premium delivery file"
                        : "No master delivery file uploaded"
                    }
                    ctaLabel={isEditing ? (replacementMasterFile ? "Replace master" : "Choose master") : undefined}
                    onChange={isEditing ? setReplacementMasterFile : undefined}
                  />
                </div>
              </FormSection>

              <FormSection
                step="03"
                eyebrow="Premium Readiness"
                title="Premium readiness"
                description={
                  asset.offerClass === "free_use"
                    ? "This diagnostic still shows whether the asset could qualify for premium delivery later. Free-use publication does not depend on it."
                    : assetDeliveryRulesCopy
                }
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(220px,0.9fr)]">
                  <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Current state
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {getAssetPrimaryReadinessNote(asset)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetDeliveryBadgeClassName(
                          readinessStatus
                        )}`}
                      >
                        {formatAssetDeliveryStatus(readinessStatus)}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {readinessNotes.map((note) => (
                        <span
                          key={note}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-sky-300/12 bg-sky-300/[0.05] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/80">
                      Current premium delivery standard
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {assetDeliveryStandards.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection
                step="04"
                eyebrow="Review Workflow"
                title="Review workflow"
                description={
                  asset.offerClass === "free_use"
                    ? "Free-use assets skip the premium review queue. Switch back to premium when you want this asset evaluated for reviewed commercial delivery."
                    : "Only delivery-ready assets can move into premium review. Only approved assets can be published."
                }
                aside={
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-sky-200">
                    <Stamp className="h-5 w-5" />
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/8 bg-slate-950/55 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Current review state
                        </p>
                        <p className="mt-2 text-xl font-display text-white">
                          {creatorReviewPresentation?.label || formatAssetReviewStatus(reviewStatus)}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">{reviewHelperCopy}</p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${creatorReviewPresentation?.badgeClassName}`}
                      >
                        {asset.offerClass === "free_use"
                          ? "Review bypassed"
                          : reviewStatus === "approved"
                          ? "Eligible for publication"
                          : reviewStatus === "in_review"
                            ? "Under review"
                            : reviewStatus === "rejected"
                              ? "Changes required"
                              : "Preparation stage"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                        Next action: {nextWorkflowAction}
                      </span>
                      {asset.offerClass === "free_use" ? (
                        <span className="rounded-full border border-emerald-300/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                          Free-use publication does not require premium review
                        </span>
                      ) : null}
                      {!canSubmitForReview &&
                      asset.offerClass === "premium" &&
                      reviewStatus !== "in_review" &&
                      reviewStatus !== "approved" ? (
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                          Blocking reason: {readinessNotes[0] || "Delivery readiness requirements not met"}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 rounded-[20px] border border-white/8 bg-black/20 p-4">
                      <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Review note
                      </label>
                      <Textarea
                        className="mt-3 min-h-[132px]"
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        placeholder="Use this to record approval context or explain rejection clearly."
                      />
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {asset.offerClass === "free_use"
                          ? "Premium review notes are optional while this asset stays in the free-use path."
                          : "Add a review note before rejecting this asset."}
                      </p>
                    </div>

                    {asset.offerClass === "premium" ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {reviewStatus !== "approved" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="gap-2"
                          disabled={!canSubmitForReview || isSubmittingReview || isUpdatingReview}
                          onClick={() => void handleSubmitForReview()}
                        >
                          <Send className="h-4 w-4" />
                          {isSubmittingReview ? "Submitting..." : "Submit for review"}
                        </Button>
                      ) : null}

                      {reviewStatus === "in_review" ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            className="gap-2 border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.14]"
                            disabled={isUpdatingReview || isSubmittingReview}
                            onClick={() => void handleReviewDecision("approved")}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {isUpdatingReview ? "Saving..." : "Approve"}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="gap-2 border-rose-400/18 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.14]"
                            disabled={isUpdatingReview || isSubmittingReview}
                            onClick={() => void handleReviewDecision("rejected")}
                          >
                            <X className="h-4 w-4" />
                            {isUpdatingReview ? "Saving..." : "Reject"}
                          </Button>
                        </>
                      ) : null}

                      {(reviewStatus === "rejected" || reviewStatus === "approved") ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="gap-2"
                          disabled={isUpdatingReview || isSubmittingReview}
                          onClick={() => void handleReviewDecision("draft")}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Return to draft
                        </Button>
                      ) : null}
                    </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {(asset.offerClass === "free_use"
                      ? freeUseLifecycleStates
                      : reviewWorkflowStates
                    ).map(([label, helper]) => (
                      <div
                        key={label}
                        className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4"
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{helper}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FormSection>

              <FormSection
                step="05"
                eyebrow="Publication Status"
                title="Publication status"
                description={
                  asset.offerClass === "free_use"
                    ? "Free-use assets become buyer-visible when their catalog status is published."
                    : "Published assets are visible to buyers only when they are both approved and delivery ready."
                }
              >
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/8 bg-slate-950/55 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Commercial state
                        </p>
                        <p className="mt-2 text-xl font-display text-white">
                          {publicationDecisionState?.label}
                        </p>
                        <p className="mt-3 text-sm text-white">{publicationDecisionState?.detail}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{publishGateCopy}</p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${publicationDecisionState?.badgeClassName}`}
                      >
                        Commercial state: {publicationDecisionState?.pillLabel}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                          asset.status
                        )}`}
                      >
                        Catalog: {formatCatalogStatus(asset.status)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${creatorReviewPresentation?.badgeClassName}`}
                      >
                        Review: {creatorReviewPresentation?.label || formatAssetReviewStatus(reviewStatus)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetDeliveryBadgeClassName(
                          readinessStatus
                        )}`}
                      >
                        Delivery: {formatAssetDeliveryStatus(readinessStatus)}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {(
                        publishBlockedReasons.length > 0
                          ? publishBlockedReasons.map((reason) => `Blocking reason: ${reason}`)
                          : [publishGateCopy]
                      ).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>

                    <p className="mt-5 text-sm leading-6 text-slate-400">
                      {getCatalogStatusHelperCopy(asset.status, "This asset")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {asset.status !== "published" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => void handleStatusChange("published")}
                      >
                        Publish
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => void handleStatusChange("draft")}
                      >
                        Unpublish
                      </Button>
                    )}
                    {asset.status !== "archived" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="border-amber-300/20 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.14]"
                        disabled={isSaving}
                        onClick={() => void handleStatusChange("archived")}
                      >
                        Archive
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => void handleStatusChange("draft")}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </FormSection>

              <FormSection
                step="06"
                eyebrow="Creator Guidance"
                title="Creator guidance"
                description="Keep the marketplace presentation clear and reserve the premium file for licensed delivery."
              >
                <div className="grid gap-4">
                  <GuidanceCard
                    title="What buyers unlock"
                    copy="Buyers first see the preview image in marketplace surfaces. After successful purchase and an active entitlement, they unlock the premium master file."
                  />
                  <GuidanceCard
                    title="How to prepare a premium asset"
                    copy="Export your final AI artwork in a high-resolution delivery format before uploading it as the master file. Use the preview image for catalog presentation and the master file for commercial delivery."
                  />
                </div>
              </FormSection>

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
                    Unused assets can be deleted. Once this asset has commercial history or is
                    still required by an active pack relationship, CauFlow preserves it and you
                    should archive or unpublish it instead.
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
