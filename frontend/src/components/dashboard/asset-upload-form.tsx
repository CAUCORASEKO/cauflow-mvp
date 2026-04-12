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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { assetDeliveryRulesCopy } from "@/lib/asset-delivery";
import {
  formatVisualAssetType,
  getVisualAssetTypeDescription,
  visualAssetTypeOptions
} from "@/lib/visual-taxonomy";
import { formatFileSize } from "@/lib/utils";
import type { Asset } from "@/types/api";

const uploadMeta = [
  {
    label: "Preview image",
    helper: "Shown in workspace and marketplace surfaces."
  },
  {
    label: "Master delivery file",
    helper: "Unlocked later for licensed buyers."
  },
  {
    label: "Delivery readiness",
    helper: "Assets need a valid premium file before they are ready for high-value licensing."
  }
] as const;

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
      setFeedback("Asset created successfully.");
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
              Register a buyer-facing preview and the original premium file together, so the
              catalog can distinguish presentation media from future licensed delivery. New assets
              start in draft and move into review once delivery is technically ready.
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-200 md:flex">
            <UploadCloud className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {uploadMeta.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{item.helper}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 xl:p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Asset title</label>
              <Input
                placeholder="Premium campaign stills"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(260px,0.72fr)]">
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
                  Describe the visual format or creative discipline of this asset. This appears in
                  marketplace and licensing surfaces.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Classification
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatVisualAssetType(visualType)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {getVisualAssetTypeDescription(visualType)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Licensing description
              </label>
              <Textarea
                className="min-h-36"
                placeholder="Describe the asset, origin, intended usage, and why it belongs in the licensable catalog."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr),minmax(300px,0.84fr)]">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-slate-200">
                <ShieldCheck className="h-4 w-4 text-sky-200" />
                <p className="text-sm font-medium">Delivery readiness rules</p>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {assetDeliveryRulesCopy}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Preview image
                </p>
                <p className="mt-2 text-sm text-white">
                  {previewImage ? "Selected" : "Required for new assets"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Shown in workspace and marketplace surfaces.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Master delivery file
                </p>
                <p className="mt-2 text-sm text-white">
                  {masterFile ? "Selected" : "Optional now, required for ready status"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Original or premium file reserved for later buyer delivery.
                </p>
              </div>
              <div className="rounded-[22px] border border-sky-300/12 bg-sky-300/[0.05] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/80">
                  Supported files
                </p>
                <p className="mt-2 text-sm text-white">JPG, PNG, or WebP</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Master files can be larger. Metadata and technical readiness are captured
                  automatically when you upload.
                </p>
              </div>
            </div>
          </div>

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
                  <p className="mt-5 text-sm font-medium text-white">Select a preview image</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Shown in workspace and marketplace surfaces.
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
                    Add the master delivery file
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Original or premium file reserved for licensed delivery later.
                  </p>
                </div>

                <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Delivery readiness
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {masterFile ? "Master file attached" : "Needs master file"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {masterFile
                      ? "Metadata will be captured from the uploaded premium file."
                      : "Assets without a master delivery file stay in needs-fixes status."}
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

          {submitting ? (
            <ActionFeedback
              tone="pending"
              message="Uploading asset to the live workspace"
              detail="Preview and master file metadata are being captured against the live asset record."
            />
          ) : null}
          {feedback ? (
            <ActionFeedback
              tone="success"
              message={feedback}
              detail="The asset catalog refreshes after the request completes."
            />
          ) : null}
          {error ? <ActionFeedback tone="error" message={error} /> : null}

          <div className="flex flex-col gap-3 border-t border-white/8 pt-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <p className="text-sm text-slate-400">
              Preview media stays buyer-facing. Master delivery files stay creator-side for the
              next premium delivery phase.
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className="min-w-[180px] gap-2"
              aria-busy={submitting}
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Creating asset..." : "Create asset"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
