import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileImage,
  FolderUp,
  LoaderCircle,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { createAsset } from "@/services/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormSection } from "@/components/dashboard/form-section";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { assetDeliveryRulesCopy, assetDeliveryStandards } from "@/lib/asset-delivery";
import {
  formatVisualAssetType,
  getVisualAssetTypeDescription,
  visualAssetTypeOptions
} from "@/lib/visual-taxonomy";
import { formatFileSize } from "@/lib/utils";
import type { Asset } from "@/types/api";

const filePickerClassName =
  "group flex min-h-[220px] cursor-pointer flex-col rounded-[28px] border border-dashed p-4 transition-all duration-300 hover:border-sky-300/30 hover:bg-white/[0.04] hover:shadow-[0_18px_40px_rgba(2,8,23,0.18)]";

export function AssetUploadForm({
  onCreated
}: {
  onCreated: (asset: Asset) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visualType, setVisualType] = useState<Asset["visualType"]>("photography");
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewImageUrl = useMemo(
    () => (previewImage ? URL.createObjectURL(previewImage) : null),
    [previewImage]
  );

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(
    () => () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    },
    [previewImageUrl]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const createdAsset = await createAsset({
        title,
        description,
        visualType,
        previewImage,
        masterFile
      });
      setTitle("");
      setDescription("");
      setVisualType("photography");
      setPreviewImage(null);
      setMasterFile(null);
      setFeedback("Asset saved successfully.");
      await onCreated(createdAsset);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to create asset"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="surface-highlight overflow-hidden p-0">
      <div className="border-b border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent px-5 py-5 xl:px-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Asset intake</p>
            <h3 className="mt-3 font-display text-[1.9rem] leading-none text-white">
              Upload new asset
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Build a premium catalog listing with a public preview, a protected delivery file,
              and clear workflow gates from draft through publication.
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-200 md:flex">
            <UploadCloud className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="p-5 xl:p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormSection
            step="01"
            eyebrow="Asset Basics"
            title="Asset basics"
            description="Define the core identity and commercial positioning of this visual asset."
            aside={
              <div className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Classification
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatVisualAssetType(visualType)}
                </p>
                <p className="mt-2 max-w-[260px] text-sm leading-6 text-slate-400">
                  {getVisualAssetTypeDescription(visualType)}
                </p>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Asset title</label>
                <Input
                  placeholder="Premium campaign stills"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
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
                  onChange={(event) => setVisualType(event.target.value as Asset["visualType"])}
                  required
                >
                  {visualAssetTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="text-sm leading-6 text-slate-400">
                  This helps buyers understand the visual discipline of the asset in marketplace
                  and licensing surfaces.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Licensing description
                </label>
                <Textarea
                  className="min-h-36"
                  placeholder="Describe the creative context, intended usage, and commercial value of this asset."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <p className="text-sm leading-6 text-slate-400">
                  Describe the creative context and intended commercial value of the asset.
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection
            step="02"
            eyebrow="Files"
            title="Files"
            description="Upload both the public preview and the premium delivery file. Buyers see the preview first, but licensed buyers unlock the master file after purchase."
          >
            <div className="grid gap-4 2xl:grid-cols-2">
            <label className={`${filePickerClassName} border-white/15 bg-white/[0.025]`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setPreviewImage(event.target.files?.[0] || null)}
                className="sr-only"
                required
              />

              {previewImageUrl ? (
                <div className="relative overflow-hidden rounded-2xl border border-white/10">
                  <img
                    src={previewImageUrl}
                    alt={previewImage?.name || "Preview image"}
                    className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-white">
                        {previewImage?.name}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/[0.12] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Preview set
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/8 bg-black/20 px-5 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-sky-200">
                    <FileImage className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-white">Preview image</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Use a polished catalog-ready image that represents the asset clearly.
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Preview image
                  </p>
                  <p className="mt-1 max-w-[320px] truncate text-sm text-slate-300">
                    {previewImage?.name || "No file selected"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Shown in workspace and marketplace surfaces.
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {previewImage ? formatFileSize(previewImage.size) : "Required"}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white">
                  {previewImage ? "Replace preview" : "Choose preview"}
                </span>
              </div>
            </label>

            <label className={`${filePickerClassName} border-white/10 bg-black/20`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setMasterFile(event.target.files?.[0] || null)}
                className="sr-only"
              />

              <div className="flex flex-1 flex-col justify-between rounded-2xl border border-white/8 bg-black/20 px-5 py-8">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-sky-200">
                    <FolderUp className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-white">
                    Master delivery file
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Upload the final high-resolution version you want to deliver commercially after
                    successful purchase.
                  </p>
                </div>

                <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Buyer unlock</p>
                  <p className="mt-2 text-sm text-white">
                    {masterFile ? "Premium file attached" : "Locked until purchase"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {masterFile
                      ? "Licensed buyers unlock this premium delivery file after successful purchase."
                      : "This is the premium file buyers are purchasing access to."}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Master delivery file
                  </p>
                  <p className="mt-1 max-w-[320px] truncate text-sm text-slate-300">
                    {masterFile?.name || "No file selected"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Unlocked later for licensed buyers as the premium delivery file.
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {masterFile ? formatFileSize(masterFile.size) : "Optional on create"}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white">
                  {masterFile ? "Replace master" : "Choose master"}
                </span>
              </div>
            </label>
            </div>
          </FormSection>

          <FormSection
            step="03"
            eyebrow="Delivery Readiness"
            title="Delivery readiness"
            description={assetDeliveryRulesCopy}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(280px,0.9fr)]">
              <div className="rounded-[24px] border border-sky-300/12 bg-sky-300/[0.05] p-4">
                <div className="flex items-center gap-2 text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-sky-200" />
                  <p className="text-sm font-medium">Current premium delivery standard</p>
                </div>
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

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Preview status
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {previewImage ? "Preview image uploaded" : "Missing preview image"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Master status
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {masterFile ? "Master delivery file uploaded" : "Missing master delivery file"}
                  </p>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection
            step="04"
            eyebrow="Review Workflow"
            title="Review workflow"
            description="Only delivery-ready assets can move into premium review. Only approved assets can be published."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Draft", "This asset is still being prepared for review."],
                ["In review", "This asset is currently under premium catalog review."],
                ["Approved", "This asset has passed review and is eligible for publication."],
                ["Rejected", "This asset needs changes before it can enter the premium catalog."]
              ].map(([label, helper]) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{helper}</p>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection
            step="05"
            eyebrow="Publication Status"
            title="Publication status"
            description="Published assets are visible to buyers only when they are both approved and delivery ready."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "This asset must be approved before it can be published.",
                "This asset still needs delivery fixes before it can go live.",
                "Only approved, delivery-ready assets are visible to buyers."
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection
            step="06"
            eyebrow="Creator Guidance"
            title="Creator guidance"
            description="Keep the marketplace presentation clean and reserve the premium file for licensed delivery."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  What buyers unlock
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Buyers first see the preview image in marketplace surfaces. After successful
                  purchase and an active entitlement, they unlock the premium master file.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  How to prepare a premium asset
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Export your final AI artwork in a high-resolution delivery format before
                  uploading it as the master file. Use the preview image for catalog presentation
                  and the master file for commercial delivery.
                </p>
              </div>
            </div>
          </FormSection>

          {submitting ? (
            <ActionFeedback
              tone="pending"
              message="Saving asset..."
              detail="Preview and master file metadata are being captured for this premium asset record."
            />
          ) : null}
          {feedback ? (
            <ActionFeedback tone="success" message={feedback} />
          ) : null}
          {error ? <ActionFeedback tone="error" message={error} /> : null}

          <div className="flex flex-col gap-3 border-t border-white/8 pt-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <p className="text-sm text-slate-400">
              The preview image stays buyer-facing. The master delivery file stays protected until
              a licensed buyer unlocks it.
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className="min-w-[180px] gap-2"
              aria-busy={submitting}
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Saving asset..." : "Create asset"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
