import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

export function DashboardEmptyState({
  icon: Icon,
  eyebrow,
  title,
  copy,
  hint
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  copy: string;
  hint: string;
}) {
  return (
    <div className="surface-highlight rounded-[28px] border border-dashed border-white/12 bg-white/[0.025] p-6 md:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200 shadow-[0_12px_30px_rgba(8,47,73,0.25)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300/80">
            {eyebrow}
          </p>
          <h3 className="mt-2 font-display text-2xl text-white">{title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{copy}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-sky-300/12 bg-sky-300/[0.07] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-sky-100">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {hint}
          </div>
        </div>
      </div>
    </div>
  );
}
