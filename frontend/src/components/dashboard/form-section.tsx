import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormSection({
  step,
  eyebrow,
  title,
  description,
  children,
  aside,
  className
}: PropsWithChildren<{
  step: string;
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className
      )}
    >
      <div className="flex flex-col gap-4 border-b border-white/8 pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-sky-300/18 bg-sky-300/[0.08] px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">
              {step}
            </span>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300/80">
              {eyebrow}
            </p>
          </div>
          <h4 className="mt-3 font-display text-[1.35rem] font-medium tracking-tight text-white">
            {title}
          </h4>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {description}
          </p>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>

      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}
