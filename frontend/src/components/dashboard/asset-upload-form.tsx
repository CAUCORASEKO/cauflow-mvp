import { useMemo, useState, type FormEvent } from "react";
import { UploadCloud } from "lucide-react";
import { createAsset } from "@/services/api";
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

  const selectedFileLabel = useMemo(() => image?.name || "No image selected", [image]);

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
    <Card className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-white">Upload new asset</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Add a premium visual, model output, dataset, or template to your
            licensing inventory.
          </p>
        </div>
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-sky-200 md:flex">
          <UploadCloud className="h-5 w-5" />
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          placeholder="Asset title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <Textarea
          placeholder="Describe the asset and what makes it licensable"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <label className="block rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4">
          <span className="mb-3 block text-sm font-medium text-slate-200">
            Asset preview image
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImage(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-slate-950"
          />
          <span className="mt-3 block text-xs text-slate-500">{selectedFileLabel}</span>
        </label>

        {feedback ? <p className="text-sm text-emerald-300">{feedback}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating asset..." : "Create asset"}
        </Button>
      </form>
    </Card>
  );
}
