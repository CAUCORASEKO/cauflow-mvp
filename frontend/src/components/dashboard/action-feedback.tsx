import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackTone = "success" | "error" | "pending";

const toneMap: Record<
  FeedbackTone,
  {
    icon: LucideIcon;
    className: string;
    iconClassName: string;
    label: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-400/18 bg-emerald-400/[0.08] text-emerald-50",
    iconClassName: "text-emerald-300",
    label: "Success"
  },
  error: {
    icon: AlertCircle,
    className: "border-rose-400/18 bg-rose-400/[0.08] text-rose-50",
    iconClassName: "text-rose-300",
    label: "Issue"
  },
  pending: {
    icon: LoaderCircle,
    className: "border-sky-300/18 bg-sky-300/[0.08] text-sky-50",
    iconClassName: "animate-spin text-sky-200",
    label: "In progress"
  }
};

export function ActionFeedback({
  tone,
  message,
  detail
}: {
  tone: FeedbackTone;
  message: string;
  detail?: string;
}) {
  const { icon: Icon, className, iconClassName, label } = toneMap[tone];

  return (
    <div
      className={cn(
        "surface-highlight rounded-[22px] border px-4 py-3 transition-all duration-300",
        className
      )}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/20">
          <Icon className={cn("h-4 w-4", iconClassName)} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{label}</p>
          <p className="mt-1 text-sm font-medium text-white">{message}</p>
          {detail ? <p className="mt-1 text-sm leading-6 text-white/80">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}
