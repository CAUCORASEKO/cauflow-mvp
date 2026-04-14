import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminStatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="surface-highlight p-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 font-display text-3xl text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
    </Card>
  );
}

export function AdminStatusPill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
      : tone === "info"
        ? "border-sky-300/20 bg-sky-300/[0.08] text-sky-100"
        : tone === "warning"
          ? "border-amber-300/18 bg-amber-300/[0.08] text-amber-100"
          : tone === "danger"
            ? "border-rose-400/18 bg-rose-400/[0.08] text-rose-100"
            : "border-white/10 bg-white/[0.04] text-slate-300";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
        toneClassName
      )}
    >
      {label}
    </span>
  );
}

export function AdminEmptyState({
  title,
  copy,
  actionLabel,
  actionHref
}: {
  title: string;
  copy: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Card className="surface-highlight p-6">
      <p className="text-lg text-white">{title}</p>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{copy}</p>
      {actionLabel && actionHref ? (
        <div className="mt-5">
          <Link to={actionHref}>
            <Button variant="secondary">{actionLabel}</Button>
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
