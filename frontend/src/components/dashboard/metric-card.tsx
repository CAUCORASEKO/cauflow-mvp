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
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-sky-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{detail}</p>
    </Card>
  );
}
