import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, FileImage, LoaderCircle, UploadCloud } from "lucide-react";
import { createAsset } from "@/services/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AssetUploadForm({
  onCreated
}: {
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const selectedFileLabel = useMemo(() => image?.name || "No image selected", [image]);
  const selectedFileSize = useMemo(() => {
    if (!image) {
      return null;
    }

    return `${(image.size / (1024 * 1024)).toFixed(2)} MB`;
  }, [image]);
  const imagePreview = useMemo(() => {
    if (!image) {
      return null;
    }

    return URL.createObjectURL(image);
  }, [image]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3200);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      await createAsset({ title, description, image });
      setTitle("");
      setDescription("");
      setImage(null);
      setFeedback("Asset created successfully.");
      await onCreated();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create asset"
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
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">
              Asset intake
            </p>
            <h3 className="mt-3 font-display text-[1.9rem] leading-none text-white">
              Upload new asset
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Register a licensable visual with strong metadata and a clean preview so
              it enters the catalog ready for packaging.
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-200 md:flex">
            <UploadCloud className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Flow
            </p>
            <p className="mt-1 text-sm font-medium text-white">Asset to inventory</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Required
            </p>
            <p className="mt-1 text-sm font-medium text-white">Title and image</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Outcome
            </p>
            <p className="mt-1 text-sm font-medium text-white">Live preview card</p>
          </div>
        </div>
      </div>

      <div className="p-5 xl:p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr),272px]">
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Licensing description
                </label>
                <Textarea
                  placeholder="Describe the asset, origin, intended usage, and why it belongs in the licensable catalog."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>

            <label
              className={`group flex min-h-[220px] cursor-pointer flex-col rounded-[28px] border border-dashed p-4 transition-all duration-300 2xl:min-h-[260px] ${
                isDragging || isPickerActive
                  ? "border-sky-300/40 bg-sky-300/[0.06] shadow-[0_0_0_1px_rgba(125,211,252,0.14),0_18px_40px_rgba(2,8,23,0.24)]"
                  : "border-white/15 bg-white/[0.025] hover:border-sky-300/30 hover:bg-white/[0.04] hover:shadow-[0_18px_40px_rgba(2,8,23,0.18)]"
              }`}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDrop={() => setIsDragging(false)}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
                className="sr-only"
                onFocus={() => setIsPickerActive(true)}
                onBlur={() => setIsPickerActive(false)}
              />

              {imagePreview ? (
                <div className="relative overflow-hidden rounded-2xl border border-white/10">
                  <img
                    src={imagePreview}
                    alt={selectedFileLabel}
                    className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.015] 2xl:aspect-[4/3]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-white">
                        {selectedFileLabel}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/[0.12] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/8 bg-black/20 px-5 py-8 text-center transition-all duration-300 group-hover:border-sky-300/15 group-hover:bg-black/25">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-sky-200 transition-all duration-300 group-hover:bg-sky-300/10 group-hover:shadow-[0_14px_28px_rgba(14,165,233,0.12)]">
                    <FileImage className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-sm font-medium text-white">
                    Select a preview image
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    PNG, JPG, or WebP. The existing upload request stays unchanged while
                    the workspace confirms the selected file more clearly.
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Current file
                  </p>
                  <p className="mt-1 max-w-[180px] truncate text-sm text-slate-300">
                    {selectedFileLabel}
                  </p>
                  {selectedFileSize ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {selectedFileSize}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-all duration-300 group-hover:border-sky-300/20 group-hover:bg-sky-300/[0.08]">
                  {image ? "Replace image" : "Choose image"}
                </span>
              </div>
            </label>
          </div>

          {submitting ? (
            <ActionFeedback
              tone="pending"
              message="Uploading asset to the live workspace"
              detail="The form stays connected to the current backend asset creation flow."
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
              Uploaded assets appear immediately in the live inventory after refresh.
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
