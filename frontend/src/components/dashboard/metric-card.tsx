import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="surface-highlight group p-5 hover:-translate-y-0.5 hover:border-white/14 hover:bg-slate-950/70 hover:shadow-[0_20px_45px_rgba(2,8,23,0.32)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-sky-200 transition-all duration-300 group-hover:border-sky-300/20 group-hover:bg-sky-300/10 group-hover:shadow-[0_16px_35px_rgba(14,165,233,0.12)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
        {detail}
      </p>
    </Card>
  );
}
