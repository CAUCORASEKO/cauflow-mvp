import { ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { LicensePolicyInput } from "@/lib/license-policy";

const segmentedButtonClass = (active: boolean) =>
  active
    ? "border-sky-300/20 bg-sky-300/[0.12] text-sky-100"
    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]";

export function LicensePolicyBuilder({
  enabled,
  onEnabledChange,
  value,
  onChange
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: LicensePolicyInput;
  onChange: (nextValue: LicensePolicyInput) => void;
}) {
  const update = <K extends keyof LicensePolicyInput>(
    key: K,
    nextValue: LicensePolicyInput[K]
  ) => {
    onChange({
      ...value,
      [key]: nextValue
    });
  };

  return (
    <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 border-b border-white/8 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="h-4 w-4 text-sky-200" />
            <span className="text-sm font-medium">AI License Policy</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Define AI-native usage terms so the license feels productized, not generic.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
          <Button
            type="button"
            variant={enabled ? "secondary" : "ghost"}
            className="h-9 rounded-full px-4"
            onClick={() => onEnabledChange(true)}
          >
            Policy on
          </Button>
          <Button
            type="button"
            variant={!enabled ? "secondary" : "ghost"}
            className="h-9 rounded-full px-4"
            onClick={() => onEnabledChange(false)}
          >
            Policy off
          </Button>
        </div>
      </div>

      {enabled ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Commercial use</p>
                <p className="mt-1 text-sm text-slate-400">
                  Controls whether the buyer can deploy this license commercially.
                </p>
              </div>
              <div className="inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
                <Button
                  type="button"
                  variant={value.commercialUse ? "secondary" : "ghost"}
                  className="h-9 rounded-full px-4"
                  onClick={() => update("commercialUse", true)}
                >
                  Allowed
                </Button>
                <Button
                  type="button"
                  variant={!value.commercialUse ? "secondary" : "ghost"}
                  className="h-9 rounded-full px-4"
                  onClick={() => update("commercialUse", false)}
                >
                  Not allowed
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">AI training</label>
              <Select
                value={value.aiTraining}
                onChange={(event) => update("aiTraining", event.target.value as LicensePolicyInput["aiTraining"])}
              >
                <option value="allowed">Allowed</option>
                <option value="not_allowed">Not allowed</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Derivative works
              </label>
              <Select
                value={value.derivativeWorks}
                onChange={(event) =>
                  update(
                    "derivativeWorks",
                    event.target.value as LicensePolicyInput["derivativeWorks"]
                  )
                }
              >
                <option value="allowed">Allowed</option>
                <option value="restricted">Restricted</option>
                <option value="not_allowed">Not allowed</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Attribution</label>
              <Select
                value={value.attribution}
                onChange={(event) =>
                  update("attribution", event.target.value as LicensePolicyInput["attribution"])
                }
              >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
                <option value="not_required">Not required</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Redistribution</label>
              <Select
                value={value.redistribution}
                onChange={(event) =>
                  update(
                    "redistribution",
                    event.target.value as LicensePolicyInput["redistribution"]
                  )
                }
              >
                <option value="allowed">Allowed</option>
                <option value="not_allowed">Not allowed</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-200">Usage type</label>
              <Select
                value={value.usageType}
                onChange={(event) =>
                  update("usageType", event.target.value as LicensePolicyInput["usageType"])
                }
              >
                <option value="personal">Personal</option>
                <option value="commercial">Commercial</option>
                <option value="ai">AI</option>
                <option value="editorial">Editorial</option>
              </Select>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-300">
              <ShieldCheck className="h-4 w-4 text-sky-200" />
              <span className="text-sm font-medium">License scope</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`focus-ring rounded-[18px] border px-4 py-3 text-left transition ${segmentedButtonClass(
                  value.licenseScope === "non_exclusive"
                )}`}
                onClick={() => update("licenseScope", "non_exclusive")}
              >
                <p className="text-sm font-medium text-white">Non-exclusive</p>
                <p className="mt-1 text-sm text-slate-400">
                  Multiple buyers can license the same asset.
                </p>
              </button>
              <button
                type="button"
                className={`focus-ring rounded-[18px] border px-4 py-3 text-left transition ${segmentedButtonClass(
                  value.licenseScope === "exclusive"
                )}`}
                onClick={() => update("licenseScope", "exclusive")}
              >
                <p className="text-sm font-medium text-white">Exclusive</p>
                <p className="mt-1 text-sm text-slate-400">
                  Rights are positioned as a premium single-buyer package.
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[22px] border border-dashed border-white/10 bg-slate-950/45 p-4 text-sm text-slate-400">
          No policy configured yet. Turn the policy on to define AI-native usage terms
          for this license.
        </div>
      )}
    </section>
  );
}
