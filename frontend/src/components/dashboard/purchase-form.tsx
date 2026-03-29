import { useState, type FormEvent } from "react";
import { CreditCard } from "lucide-react";
import type { License } from "@/types/api";
import { createPurchase } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function PurchaseForm({
  licenses,
  onCreated
}: {
  licenses: License[];
  onCreated: () => Promise<void>;
}) {
  const [licenseId, setLicenseId] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      await createPurchase({ licenseId: Number(licenseId), buyerEmail });
      setLicenseId("");
      setBuyerEmail("");
      setFeedback("Purchase recorded successfully.");
      await onCreated();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create purchase"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-sky-200">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-2xl text-white">Record purchase</h3>
          <p className="text-sm text-slate-400">
            Simulate the legal checkout and payment trail.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Select
          value={licenseId}
          onChange={(event) => setLicenseId(event.target.value)}
          required
        >
          <option value="">Select a license</option>
          {licenses.map((license) => (
            <option key={license.id} value={license.id}>
              #{license.id} {license.type} {formatCurrency(Number(license.price))}
            </option>
          ))}
        </Select>

        <Input
          type="email"
          placeholder="buyer@company.com"
          value={buyerEmail}
          onChange={(event) => setBuyerEmail(event.target.value)}
          required
        />

        {feedback ? <p className="text-sm text-emerald-300">{feedback}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <Button
          type="submit"
          variant="secondary"
          disabled={submitting || licenses.length === 0}
          className="w-full"
        >
          {submitting ? "Creating purchase..." : "Create purchase"}
        </Button>
      </form>
    </Card>
  );
}
