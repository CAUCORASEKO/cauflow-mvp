import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  LICENSE_TYPE_OPTIONS,
  LICENSE_USAGE_OPTIONS,
  getTaxonomySelectionValue
} from "@/lib/license-taxonomy";

const CUSTOM_OPTION_VALUE = "__custom__";

export function LicenseCommercialFields({
  offerClass,
  type,
  usage,
  price,
  onTypeChange,
  onUsageChange
}: {
  offerClass: "premium" | "free_use";
  type: string;
  usage: string;
  price?: string;
  onTypeChange: (value: string) => void;
  onUsageChange: (value: string) => void;
}) {
  const selectedType = getTaxonomySelectionValue(type, LICENSE_TYPE_OPTIONS);
  const selectedUsage = getTaxonomySelectionValue(usage, LICENSE_USAGE_OPTIONS);

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-sky-100/80">
          Commercial framing
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {offerClass === "free_use"
            ? "These labels frame the asset as a free-use offer. Buyers will see zero cost and no premium delivery promise."
            : "These labels position the premium offer for buyers and appear throughout checkout, sales history, and active licenses."}
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {offerClass === "free_use" ? `Buyer price: ${price || "0"}` : "Premium commercial packaging"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">License type</label>
          <Select
            value={selectedType}
            onChange={(event) =>
              onTypeChange(
                event.target.value === CUSTOM_OPTION_VALUE ? "" : event.target.value
              )
            }
            required
          >
            {LICENSE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value={CUSTOM_OPTION_VALUE}>Custom</option>
          </Select>
          <p className="text-xs leading-5 text-slate-400">
            Choose the commercial positioning of this rights package.
          </p>
          {selectedType === CUSTOM_OPTION_VALUE ? (
            <Input
              placeholder="Name a custom license type"
              value={type}
              onChange={(event) => onTypeChange(event.target.value)}
              required
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100">Scope / usage</label>
          <Select
            value={selectedUsage}
            onChange={(event) =>
              onUsageChange(
                event.target.value === CUSTOM_OPTION_VALUE ? "" : event.target.value
              )
            }
            required
          >
            {LICENSE_USAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value={CUSTOM_OPTION_VALUE}>Custom</option>
          </Select>
          <p className="text-xs leading-5 text-slate-400">
            Describe the primary usage context the buyer is licensing.
          </p>
          {selectedUsage === CUSTOM_OPTION_VALUE ? (
            <Input
              placeholder="Name a custom usage context"
              value={usage}
              onChange={(event) => onUsageChange(event.target.value)}
              required
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
