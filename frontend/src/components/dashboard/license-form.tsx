import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import type { Asset } from "@/types/api";
import { createLicense } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function LicenseForm({
  assets,
  onCreated
}: {
  assets: Asset[];
  onCreated: () => Promise<void>;
}) {
  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState("standard");
  const [price, setPrice] = useState("");
  const [usage, setUsage] = useState("web");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      await createLicense({
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
      await onCreated();
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
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-sky-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-2xl text-white">Define license</h3>
          <p className="text-sm text-slate-400">
            Turn uploaded IP into a clear monetization unit.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="License type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            required
          />
          <Input
            placeholder="Usage"
            value={usage}
            onChange={(event) => setUsage(event.target.value)}
            required
          />
        </div>

        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="Price"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
        />

        {feedback ? <p className="text-sm text-emerald-300">{feedback}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button
          type="submit"
          variant="secondary"
          disabled={submitting || assets.length === 0}
          className="w-full"
        >
          {submitting ? "Creating license..." : "Create license"}
        </Button>
      </form>
    </Card>
  );
}
