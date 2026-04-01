import { useEffect, useState, type FormEvent } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import type { License } from "@/types/api";
import { createPurchase } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { FormActionFooter } from "@/components/dashboard/form-action-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function PurchaseForm({
  licenses,
  onCreated
}: {
  licenses: License[];
  onCreated: (purchase: { id: number; licenseId: number; buyerEmail: string; status: string; createdAt: string }) => void | Promise<void>;
}) {
  const [licenseId, setLicenseId] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
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
      const createdPurchase = await createPurchase({
        licenseId: Number(licenseId),
        buyerEmail
      });
      setLicenseId("");
      setBuyerEmail("");
      setFeedback("Purchase recorded successfully.");
      await onCreated(createdPurchase);
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
    <Card className="surface-highlight p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5 text-sky-200">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-300/80">
            Transaction trail
          </p>
          <h3 className="mt-2 font-display text-2xl text-white">Record purchase</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Capture the commercial event against an existing license without changing
            the backend purchase flow.
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">License package</label>
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
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">Buyer email</label>
          <Input
            type="email"
            placeholder="buyer@company.com"
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            required
          />
        </div>

        {submitting ? (
          <ActionFeedback
            tone="pending"
            message="Recording purchase"
            detail="The transaction is being written through the current purchase endpoint."
          />
        ) : null}
        {feedback ? (
          <ActionFeedback
            tone="success"
            message={feedback}
            detail="Revenue surfaces and relationship cues update immediately."
          />
        ) : null}
        {error ? <ActionFeedback tone="error" message={error} /> : null}

        <FormActionFooter
          guidance="Recording a purchase updates the revenue signal and closes the current workflow loop."
          nextStep="Use this after the asset, pack, and license layers are already in place."
        >
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || licenses.length === 0}
            className="min-w-[176px] gap-2"
            aria-busy={submitting}
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Creating purchase..." : "Create purchase"}
          </Button>
        </FormActionFooter>
      </form>
    </Card>
  );
}
