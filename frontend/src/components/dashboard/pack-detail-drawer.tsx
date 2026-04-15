import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Box,
  ImageIcon,
  LoaderCircle,
  PencilLine,
  Star,
  Trash2,
  X
} from "lucide-react";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { PackAssetPicker } from "@/components/dashboard/pack-asset-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatLicenseSourceType, formatLicenseType } from "@/lib/license-taxonomy";
import { getAssetImageUrl, getPackById, updatePack } from "@/services/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Asset, License, Pack, PackCategory, PackStatus } from "@/types/api";
import {
  formatCatalogStatus,
  getCatalogStatusBadgeClassName,
  getCatalogStatusHelperCopy
} from "@/lib/catalog-lifecycle";
import {
  formatPackCategory,
  formatVisualAssetType,
  packCategoryOptions as categoryOptions
} from "@/lib/visual-taxonomy";

const statusOptions: PackStatus[] = ["draft", "published", "archived"];

export function PackDetailDrawer({
  packId,
  assets,
  licenses,
  isDeleting,
  onClose,
  onDeleteRequest,
  onPackUpdated
}: {
  packId: number | null;
  assets: Asset[];
  licenses: License[];
  isDeleting?: boolean;
  onClose: () => void;
  onDeleteRequest: (pack: Pack) => void;
  onPackUpdated: (pack: Pack) => void;
}) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PackCategory>("mixed_visuals");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<PackStatus>("draft");
  const [licenseId, setLicenseId] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [coverAssetId, setCoverAssetId] = useState<number | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!packId) {
      setPack(null);
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
  }, [onClose, packId]);

  useEffect(() => {
    if (!packId) {
      return;
    }

    let cancelled = false;

    const loadPack = async () => {
      try {
        setLoading(true);
        setError(null);
        setSaveFeedback(null);
        setSaveError(null);
        const nextPack = await getPackById(packId);

        if (cancelled) {
          return;
        }

        setPack(nextPack);
        setTitle(nextPack.title);
        setDescription(nextPack.description);
        setCategory(nextPack.category);
        setPrice(String(nextPack.price));
        setStatus(nextPack.status);
        setLicenseId(nextPack.licenseId ? String(nextPack.licenseId) : "");
        setSelectedAssetIds(nextPack.assets?.map((item) => item.assetId) || []);
        setCoverAssetId(nextPack.coverAssetId);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setPack(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load pack");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPack();

    return () => {
      cancelled = true;
    };
  }, [packId]);

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

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [assets, selectedAssetIds]
  );
  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.status !== "archived"),
    [assets]
  );
  const availableLicenses = useMemo(
    () =>
      licenses.filter(
        (license) =>
          license.status !== "archived" &&
          (license.sourceType === "pack"
            ? license.sourcePackId === pack?.id
            : selectedAssetIds.includes(license.sourceAssetId || license.assetId || -1))
      ),
    [licenses, pack?.id, selectedAssetIds]
  );

  const coverAsset =
    selectedAssets.find((asset) => asset.id === coverAssetId) || pack?.coverAsset || null;

  const handleLifecycleChange = async (nextStatus: PackStatus) => {
    if (!pack || nextStatus === pack.status) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedPack = await updatePack(pack.id, {
        title: pack.title,
        description: pack.description,
        category: pack.category,
        price: Number(pack.price),
        status: nextStatus,
        licenseId: pack.licenseId,
        coverAssetId: pack.coverAssetId,
        assetIds: pack.assets?.map((item) => item.assetId) || selectedAssetIds
      });

      setPack(updatedPack);
      setTitle(updatedPack.title);
      setDescription(updatedPack.description);
      setCategory(updatedPack.category);
      setPrice(String(updatedPack.price));
      setStatus(updatedPack.status);
      setLicenseId(updatedPack.licenseId ? String(updatedPack.licenseId) : "");
      setSelectedAssetIds(updatedPack.assets?.map((item) => item.assetId) || []);
      setCoverAssetId(updatedPack.coverAssetId);
      setSaveFeedback(`Pack moved to ${formatCatalogStatus(nextStatus).toLowerCase()}.`);
      onPackUpdated(updatedPack);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error ? submissionError.message : "Unable to update pack lifecycle"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!packId) {
    return null;
  }

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pack) {
      return;
    }

    if (selectedAssetIds.length === 0) {
      setPickerError("Select at least one asset to keep the pack valid.");
      return;
    }

    if (!coverAssetId || !selectedAssetIds.includes(coverAssetId)) {
      setPickerError("Choose one selected asset as the pack cover.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveFeedback(null);
      setSaveError(null);
      const updatedPack = await updatePack(pack.id, {
        title,
        description,
        category,
        price: Number(price),
        status,
        licenseId: licenseId ? Number(licenseId) : null,
        coverAssetId,
        assetIds: selectedAssetIds
      });

      setPack(updatedPack);
      setTitle(updatedPack.title);
      setDescription(updatedPack.description);
      setCategory(updatedPack.category);
      setPrice(String(updatedPack.price));
      setStatus(updatedPack.status);
      setLicenseId(updatedPack.licenseId ? String(updatedPack.licenseId) : "");
      setSelectedAssetIds(updatedPack.assets?.map((item) => item.assetId) || []);
      setCoverAssetId(updatedPack.coverAssetId);
      setIsEditing(false);
      setSaveFeedback("Pack updated successfully.");
      onPackUpdated(updatedPack);
    } catch (submissionError) {
      setSaveError(
        submissionError instanceof Error ? submissionError.message : "Unable to update pack"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close pack detail"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 flex h-full w-full max-w-[760px] flex-col border-l border-white/10 bg-slate-950/95 shadow-[-30px_0_90px_rgba(2,8,23,0.55)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Pack detail
            </p>
            <h3 className="mt-2 font-display text-2xl text-white">
              {loading ? "Loading pack..." : pack?.title || "Pack detail"}
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
                <div className="mt-4 h-8 w-56 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
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
                Pack unavailable
              </p>
              <h4 className="mt-2 font-display text-2xl text-white">Unable to open pack</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
              <div className="mt-5 flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : pack ? (
            <div className="space-y-6">
              {saveFeedback ? <ActionFeedback tone="success" message={saveFeedback} /> : null}
              {saveError ? <ActionFeedback tone="error" message={saveError} /> : null}

              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
                <div className="relative min-h-[360px] border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 sm:min-h-[420px]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.68))]" />
                  {getAssetImageUrl(coverAsset?.imageUrl || null) ? (
                    <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_60px_rgba(2,8,23,0.3)]">
                        <img
                          src={getAssetImageUrl(coverAsset?.imageUrl || null) || ""}
                          alt={pack.title}
                          className="h-full w-full object-contain object-center"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute left-5 top-5 flex items-center gap-2">
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.1] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100">
                      <Star className="mr-1 inline h-3.5 w-3.5" />
                      Cover asset
                    </span>
                    <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                      {pack.assetCount} assets
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {formatPackCategory(pack.category)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                        pack.status
                      )}`}
                    >
                      {formatCatalogStatus(pack.status)}
                    </span>
                  </div>
                  <h4 className="mt-4 font-display text-[2rem] text-white">{pack.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{pack.description}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Pack ID" value={`#${pack.id}`} />
                <MetricCard label="Category" value={formatPackCategory(pack.category)} />
                <MetricCard
                  label="Price"
                  value={formatCurrency(Number(pack.price))}
                />
                <MetricCard
                  label="Attached rights"
                  value={pack.license ? formatLicenseType(pack.license.type) : "None"}
                />
                <MetricCard
                  label="Created"
                  value={formatDate(pack.createdAt)}
                />
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                    pack.status
                  )}`}
                >
                  {formatCatalogStatus(pack.status)}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setIsEditing((currentValue) => !currentValue)}
                >
                  <PencilLine className="h-4 w-4" />
                  {isEditing ? "Close editor" : "Edit pack"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 border-rose-400/20 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.14]"
                  onClick={() => onDeleteRequest(pack)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete pack"}
                </Button>
              </div>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Lifecycle
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {getCatalogStatusHelperCopy(pack.status, "This pack")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pack.status !== "published" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => void handleLifecycleChange("published")}
                      >
                        Publish
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => void handleLifecycleChange("draft")}
                      >
                        Unpublish
                      </Button>
                    )}
                    {pack.status !== "archived" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="border-amber-300/20 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.14]"
                        disabled={isSaving}
                        onClick={() => void handleLifecycleChange("archived")}
                      >
                        Archive
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => void handleLifecycleChange("draft")}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </section>

              {isEditing ? (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Pack identity
                    </p>
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">Title</label>
                        <Input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
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
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Commercial setup
                    </p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">Category</label>
                        <Select
                          value={category}
                          onChange={(event) =>
                            setCategory(event.target.value as PackCategory)
                          }
                          required
                        >
                          {categoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        <p className="text-sm leading-6 text-slate-400">
                          Position the pack by the main visual format represented across
                          the included assets.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">Status</label>
                        <Select
                          value={status}
                          onChange={(event) => setStatus(event.target.value as PackStatus)}
                          required
                        >
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>
                              {formatCatalogStatus(option)}
                            </option>
                          ))}
                        </Select>
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
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">Attached rights package</label>
                        <Select
                          value={licenseId}
                          onChange={(event) => setLicenseId(event.target.value)}
                        >
                          <option value="">No attached license</option>
                          {availableLicenses.map((license) => (
                            <option key={license.id} value={license.id}>
                              {formatLicenseSourceType(license.sourceType)} · {formatLicenseType(license.type)} · #{license.id}
                            </option>
                          ))}
                        </Select>
                        <p className="text-sm leading-6 text-slate-400">
                          Attach either a pack-native license for this pack or a legacy asset-derived license from one of the included assets.
                        </p>
                      </div>
                    </div>
                  </section>

                  <PackAssetPicker
                    assets={availableAssets}
                    selectedAssetIds={selectedAssetIds}
                    coverAssetId={coverAssetId}
                    onToggleAsset={handleToggleAsset}
                    onSelectCover={handleSelectCover}
                    error={pickerError}
                  />

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setTitle(pack.title);
                        setDescription(pack.description);
                        setCategory(pack.category);
                        setPrice(String(pack.price));
                        setStatus(pack.status);
                        setLicenseId(pack.licenseId ? String(pack.licenseId) : "");
                        setSelectedAssetIds(pack.assets?.map((item) => item.assetId) || []);
                        setCoverAssetId(pack.coverAssetId);
                        setPickerError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="secondary"
                      className="gap-2"
                      disabled={isSaving}
                    >
                      {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </form>
              ) : null}

              <section className="rounded-[26px] border border-rose-400/10 bg-rose-400/[0.04] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-white">
                      <Trash2 className="h-4 w-4 text-rose-200" />
                      <p className="text-sm font-medium">Delete pack</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      CauFlow blocks deletion when this pack is already tied to purchase or grant history. Existing assets and licenses stay untouched.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2 border-rose-400/20 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.14]"
                    onClick={() => onDeleteRequest(pack)}
                    disabled={isDeleting || isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete pack"}
                  </Button>
                </div>
              </section>

              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Included assets
                    </p>
                    <h4 className="mt-2 font-display text-xl text-white">
                      Commercial contents
                    </h4>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    {pack.assets?.length || 0} items
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {pack.assets?.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-[22px] border border-white/8 bg-slate-950/45 p-3 md:grid-cols-[88px,minmax(0,1fr)]"
                    >
                      <div className="overflow-hidden rounded-[18px] border border-white/10 bg-slate-900">
                        {getAssetImageUrl(item.asset.imageUrl || null) ? (
                          <img
                            src={getAssetImageUrl(item.asset.imageUrl || null) || ""}
                            alt={item.asset.title}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="font-medium text-white">{item.asset.title}</h5>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            #{item.asset.id}
                          </span>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                            {formatVisualAssetType(item.asset.visualType)}
                          </span>
                          {pack.coverAssetId === item.assetId ? (
                            <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.1] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100">
                              Cover
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {item.asset.description || "No description available."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-300">Pack not found</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
