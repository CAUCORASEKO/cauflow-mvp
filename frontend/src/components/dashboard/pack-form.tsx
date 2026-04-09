import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Box, LoaderCircle } from "lucide-react";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { FormActionFooter } from "@/components/dashboard/form-action-footer";
import { FormSection } from "@/components/dashboard/form-section";
import { PackAssetPicker } from "@/components/dashboard/pack-asset-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatLicenseType } from "@/lib/license-taxonomy";
import { formatCurrency } from "@/lib/utils";
import { createPack } from "@/services/api";
import type { Asset, License, Pack, PackCategory, PackStatus } from "@/types/api";

const categoryOptions: PackCategory[] = [
  "visual",
  "brand",
  "character",
  "concept",
  "dataset",
  "prompt",
  "mixed"
];

const statusOptions: PackStatus[] = ["draft", "published"];

export function PackForm({
  assets,
  licenses,
  onCreated
}: {
  assets: Asset[];
  licenses: License[];
  onCreated: (pack: Pack) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PackCategory>("visual");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<PackStatus>("draft");
  const [licenseId, setLicenseId] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [coverAssetId, setCoverAssetId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback && !error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFeedback(null);
      setError(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [error, feedback]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [assets, selectedAssetIds]
  );

  const selectedCoverAsset =
    selectedAssets.find((asset) => asset.id === coverAssetId) || null;
  const selectedLicense =
    licenses.find((license) => String(license.id) === licenseId) || null;

  const handleToggleAsset = (assetId: number) => {
    setPickerError(null);
    setSelectedAssetIds((currentAssetIds) => {
      if (currentAssetIds.includes(assetId)) {
        const nextAssetIds = currentAssetIds.filter((id) => id !== assetId);

        if (coverAssetId === assetId) {
          setCoverAssetId(nextAssetIds[0] || null);
        }

        return nextAssetIds;
      }

      const nextAssetIds = [...currentAssetIds, assetId];

      if (!coverAssetId) {
        setCoverAssetId(assetId);
      }

      return nextAssetIds;
    });
  };

  const handleSelectCover = (assetId: number) => {
    if (!selectedAssetIds.includes(assetId)) {
      setPickerError("The cover asset must be part of the selected pack assets.");
      return;
    }

    setPickerError(null);
    setCoverAssetId(assetId);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("visual");
    setPrice("");
    setStatus("draft");
    setLicenseId("");
    setSelectedAssetIds([]);
    setCoverAssetId(null);
    setPickerError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setError(null);
    setPickerError(null);

    if (selectedAssetIds.length === 0) {
      setSubmitting(false);
      setPickerError("Select at least one asset to build a pack.");
      return;
    }

    if (!coverAssetId || !selectedAssetIds.includes(coverAssetId)) {
      setSubmitting(false);
      setPickerError("Choose one of the selected assets as the pack cover.");
      return;
    }

    try {
      const createdPack = await createPack({
        title,
        description,
        category,
        price: Number(price),
        status,
        licenseId: licenseId ? Number(licenseId) : null,
        coverAssetId,
        assetIds: selectedAssetIds
      });

      resetForm();
      setFeedback("Pack created successfully.");
      await onCreated(createdPack);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to create pack"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="surface-highlight p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-sky-200">
          <Box className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-300/80">
            Creative product packaging
          </p>
          <h3 className="mt-2 font-display text-2xl text-white">Create pack</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Group multiple assets into a premium commercial unit with pricing, cover
            art, and an optional base license.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormSection
          step="01"
          eyebrow="Identity"
          title="Define the commercial concept"
          description="Set the product name and positioning copy buyers will use to understand the pack."
        >
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Title</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Description</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          step="02"
          eyebrow="Commercial setup"
          title="Set pricing, category, and release state"
          description="Frame how the pack should be merchandised before choosing the included assets."
        >
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Category</label>
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value as PackCategory)}
                required
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Status</label>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as PackStatus)}
                required
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Price</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Base license</label>
              <Select value={licenseId} onChange={(event) => setLicenseId(event.target.value)}>
                <option value="">No base license</option>
                {licenses.map((license) => (
                  <option key={license.id} value={license.id}>
                    {formatLicenseType(license.type)} · #{license.id}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection
          step="03"
          eyebrow="Included assets"
          title="Choose the product contents"
          description="Assemble the included visuals, then nominate the strongest one as the cover asset."
          className="p-0"
        >
          <div className="-mt-1">
            <PackAssetPicker
              assets={assets}
              selectedAssetIds={selectedAssetIds}
              coverAssetId={coverAssetId}
              onToggleAsset={handleToggleAsset}
              onSelectCover={handleSelectCover}
              error={pickerError}
              framed={false}
            />
          </div>
        </FormSection>

        <FormSection
          step="04"
          eyebrow="Summary"
          title="Review the commercial snapshot"
          description="Confirm the bundle composition, chosen cover, and monetization setup before saving."
          className="border-sky-300/12 bg-sky-300/[0.05]"
        >
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300/80">Assets</p>
              <p className="mt-2 text-sm font-semibold text-white">{selectedAssetIds.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300/80">Cover</p>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">
                {selectedCoverAsset?.title || "Select cover"}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300/80">Price</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {price ? formatCurrency(Number(price)) : "$0.00"}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
                Base license
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {selectedLicense ? selectedLicense.type : "Not attached"}
              </p>
            </div>
          </div>
        </FormSection>

        {submitting ? (
          <ActionFeedback
            tone="pending"
            message="Creating asset pack"
            detail="The product metadata and included assets are being written to the live backend."
          />
        ) : null}
        {feedback ? <ActionFeedback tone="success" message={feedback} /> : null}
        {error ? <ActionFeedback tone="error" message={error} /> : null}

        <FormActionFooter
          guidance="The pack becomes a reusable commercial product as soon as it is saved."
          nextStep="After the pack is assembled, define or attach a license package to complete the offer."
        >
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || assets.length === 0}
            className="min-w-[160px] gap-2"
            aria-busy={submitting}
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Creating pack..." : "Create pack"}
          </Button>
        </FormActionFooter>
      </form>
    </Card>
  );
}
