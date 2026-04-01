import { ArrowRight, Box, Boxes, CreditCard, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    label: "Assets uploaded",
    hint: "Seed the source inventory",
    icon: Boxes
  },
  {
    label: "Pack assembled",
    hint: "Bundle assets into a product",
    icon: Box
  },
  {
    label: "License defined",
    hint: "Attach commercial usage terms",
    icon: ShieldCheck
  },
  {
    label: "Purchase recorded",
    hint: "Track the transaction trail",
    icon: CreditCard
  }
] as const;

export function WorkflowRail({
  activeStep = 0
}: {
  activeStep?: number;
}) {
  return (
    <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/[0.03] p-4 md:grid-cols-4 md:p-5">
      {steps.map(({ label, hint, icon: Icon }, index) => {
        const isComplete = index < activeStep;
        const isActive = index === activeStep;

        return (
          <div
            key={label}
            className={cn(
              "rounded-[22px] border p-4 transition-all duration-200",
              isActive
                ? "border-sky-300/18 bg-sky-300/[0.08] shadow-[0_18px_40px_rgba(14,165,233,0.08)]"
                : isComplete
                  ? "border-emerald-400/16 bg-emerald-400/[0.06]"
                  : "border-white/8 bg-black/20"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sky-100">
                <Icon className="h-4 w-4" />
              </div>
              {index < steps.length - 1 ? (
                <ArrowRight className="mt-1 hidden h-4 w-4 text-slate-500 md:block" />
              ) : null}
            </div>
            <p className="mt-4 text-sm font-semibold text-white">{label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{hint}</p>
          </div>
        );
      })}
    </div>
  );
}
