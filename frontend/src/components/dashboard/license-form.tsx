import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { Asset, License, Pack } from "@/types/api";
import {
  DEFAULT_LICENSE_POLICY,
  type LicensePolicyInput
} from "@/lib/license-policy";
import { createLicense } from "@/services/api";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { FormActionFooter } from "@/components/dashboard/form-action-footer";
import { LicenseCommercialFields } from "@/components/dashboard/license-commercial-fields";
import { FormSection } from "@/components/dashboard/form-section";
import { LicensePolicyBuilder } from "@/components/dashboard/license-policy-builder";
import { PolicySummaryCard } from "@/components/dashboard/policy-summary-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCatalogStatus } from "@/lib/catalog-lifecycle";
import { formatOfferClass } from "@/lib/offer-class";

export function LicenseForm({
  assets,
  packs,
  onCreated
}: {
  assets: Asset[];
  packs: Pack[];
  onCreated: (license: License) => void | Promise<void>;
}) {
  const availableAssets = assets.filter((asset) => asset.status !== "archived");
  const availablePacks = packs.filter((pack) => pack.status !== "archived");
  const [sourceType, setSourceType] = useState<License["sourceType"]>("asset");
  const [sourceAssetId, setSourceAssetId] = useState("");
  const [sourcePackId, setSourcePackId] = useState("");
  const [type, setType] = useState("Standard");
  const [price, setPrice] = useState("");
  const [usage, setUsage] = useState("Web");
  const [policyEnabled, setPolicyEnabled] = useState(true);
  const [policy, setPolicy] = useState<LicensePolicyInput>(DEFAULT_LICENSE_POLICY);
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

  useEffect(() => {
    if (sourceType === "asset") {
      setSourcePackId("");
      return;
    }

    setSourceAssetId("");
  }, [sourceType]);

  const selectedAsset =
    sourceType === "asset"
      ? availableAssets.find((asset) => asset.id === Number(sourceAssetId)) || null
      : null;
  const selectedOfferClass = selectedAsset?.offerClass || "premium";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const createdLicense = await createLicense({
        sourceType,
        sourceAssetId: sourceType === "asset" ? Number(sourceAssetId) : null,
        sourcePackId: sourceType === "pack" ? Number(sourcePackId) : null,
        type,
        price: selectedOfferClass === "free_use" ? 0 : Number(price),
        usage,
        offerClass: selectedOfferClass,
        policy: policyEnabled ? policy : undefined
      });
      setSourceType("asset");
      setSourceAssetId("");
      setSourcePackId("");
      setType("Standard");
      setPrice("");
      setUsage("Web");
      setPolicyEnabled(true);
      setPolicy(DEFAULT_LICENSE_POLICY);
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
          <p className="text-xs uppercase tracking-[0.22em] text-slate-300/80">
            Rights packaging
          </p>
          <h3 className="mt-2 font-display text-2xl text-white">Define license</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Turn uploaded IP into a monetization unit with clear buyer-facing packaging, usage, and price.
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormSection
          step="01"
          eyebrow="Source record"
          title="Anchor the license to a commercial source record"
          description="Choose whether this rights package belongs to an individual asset or to a full pack, then define the buyer-facing commercial terms."
        >
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Source type</label>
              <Select
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as License["sourceType"])}
                required
              >
                <option value="asset">Asset</option>
                <option value="pack">Pack</option>
              </Select>
              <p className="text-sm leading-6 text-slate-400">
                Use asset for a single inventory item, or pack when the rights package belongs to the full bundled product.
              </p>
            </div>

            {sourceType === "asset" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Select asset</label>
                <Select
                  value={sourceAssetId}
                  onChange={(event) => setSourceAssetId(event.target.value)}
                  required
                >
                  <option value="">Select asset</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} · {formatOfferClass(asset.offerClass)} · {formatCatalogStatus(asset.status)}
                    </option>
                  ))}
                </Select>
                <p className="text-sm leading-6 text-slate-400">
                  Archived assets are preserved for history, but kept out of new rights packaging.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Select pack</label>
                <Select
                  value={sourcePackId}
                  onChange={(event) => setSourcePackId(event.target.value)}
                  required
                >
                  <option value="">Select pack</option>
                  {availablePacks.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.title} · {formatCatalogStatus(pack.status)}
                    </option>
                  ))}
                </Select>
                <p className="text-sm leading-6 text-slate-400">
                  Pack-native licenses let the bundle carry its own rights package instead of relying only on an asset-derived baseline.
                </p>
              </div>
            )}

            <LicenseCommercialFields
              offerClass={selectedOfferClass}
              type={type}
              usage={usage}
              price={selectedOfferClass === "free_use" ? "0" : price}
              onTypeChange={setType}
              onUsageChange={setUsage}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100">Price</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="2500"
                value={selectedOfferClass === "free_use" ? "0" : price}
                onChange={(event) => setPrice(event.target.value)}
                required
                disabled={selectedOfferClass === "free_use"}
              />
              <p className="text-sm leading-6 text-slate-400">
                {selectedOfferClass === "free_use"
                  ? "Free-use asset offers are fixed at zero cost and stay outside premium delivery."
                  : "Premium licenses keep their configured paid price."}
              </p>
            </div>
          </div>
        </FormSection>

        <FormSection
          step="02"
          eyebrow="Policy"
          title="Define the AI-native commercial rules"
          description="Shape attribution, training, derivatives, redistribution, and exclusivity from one policy builder."
        >
          <LicensePolicyBuilder
            enabled={policyEnabled}
            onEnabledChange={setPolicyEnabled}
            value={policy}
            onChange={setPolicy}
          />
        </FormSection>

        <FormSection
          step="03"
          eyebrow="Summary"
          title="Review the operating terms"
          description="This summary becomes the quick legal read before a purchase is recorded."
        >
          <PolicySummaryCard policy={policyEnabled ? policy : null} empty={!policyEnabled} />
        </FormSection>

        {submitting ? (
          <ActionFeedback
            tone="pending"
            message="Creating license package"
            detail="The rights package and AI-native policy are being sent to the active backend."
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

        <FormActionFooter
          guidance="The license becomes purchasable immediately after creation."
          nextStep={
            selectedOfferClass === "free_use"
              ? "Once this package exists, buyers can claim free access without entering premium checkout."
              : "Once this package exists, record a purchase to extend the commercial trail."
          }
        >
          <Button
            type="submit"
            variant="primary"
            disabled={
              submitting ||
              (sourceType === "asset" ? availableAssets.length === 0 : availablePacks.length === 0)
            }
            className="min-w-[168px] gap-2"
            aria-busy={submitting}
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Creating license..." : "Create license"}
          </Button>
        </FormActionFooter>
      </form>
    </Card>
  );
}
