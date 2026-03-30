import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { Asset } from "@/types/api";
import { createLicense } from "@/services/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function LicenseForm({
  assets,
  onCreated
}: {
  assets: Asset[];
  onCreated: (license: { id: number; assetId: number; type: string; price: number; usage: string; createdAt: string }) => void | Promise<void>;
}) {
  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState("standard");
  const [price, setPrice] = useState("");
  const [usage, setUsage] = useState("web");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3200);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const createdLicense = await createLicense({
        assetId: Number(assetId),
        type,
        price: Number(price),
        usage
      });
      setAssetId("");
      setType("standard");
      setPrice("");
      setUsage("web");
      setFeedback("License created successfully.");
      await onCreated(createdLicense);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create license"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="surface-highlight p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-sky-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Rights packaging
          </p>
          <h3 className="mt-2 font-display text-2xl text-white">Define license</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Turn uploaded IP into a monetization unit with explicit usage and price.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Source asset</label>
          <Select
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
            required
          >
            <option value="">Select an asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">License type</label>
            <Input
              placeholder="Standard"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Usage</label>
            <Input
              placeholder="Web"
              value={usage}
              onChange={(event) => setUsage(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Price</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="2500"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </div>

        {submitting ? (
          <ActionFeedback
            tone="pending"
            message="Creating license package"
            detail="The request is being sent to the active backend."
          />
        ) : null}
        {feedback ? (
          <ActionFeedback
            tone="success"
            message={feedback}
            detail="The new package is available in the purchase flow immediately."
          />
        ) : null}
        {error ? <ActionFeedback tone="error" message={error} /> : null}

        <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
          <p className="text-sm text-slate-400">
            Packages become available for purchase immediately after creation.
          </p>
          <Button
            type="submit"
            variant="secondary"
            disabled={submitting || assets.length === 0}
            className="min-w-[168px] gap-2"
            aria-busy={submitting}
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Creating license..." : "Create license"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
