import type { LicensePolicyInput } from "@/lib/license-policy";
import {
  generateLicensePolicySummary,
  getLicensePolicyBadges
} from "@/lib/license-policy";

export function PolicySummaryCard({
  policy,
  empty
}: {
  policy?: LicensePolicyInput | null;
  empty?: boolean;
}) {
  if (empty || !policy) {
    return (
      <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
          Policy summary
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          No policy configured yet.
        </p>
      </section>
    );
  }

  const summary = generateLicensePolicySummary(policy);
  const badges = getLicensePolicyBadges(policy);

  return (
    <section className="rounded-[26px] border border-sky-300/10 bg-sky-300/[0.05] p-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200/80">
        Policy summary
      </p>
      <p className="mt-3 text-sm leading-7 text-white">{summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-sky-300/15 bg-slate-950/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-sky-100"
          >
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}
