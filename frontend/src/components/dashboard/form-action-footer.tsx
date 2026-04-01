import type { PropsWithChildren, ReactNode } from "react";

export function FormActionFooter({
  guidance,
  nextStep,
  children
}: PropsWithChildren<{
  guidance: string;
  nextStep?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/8 pt-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{guidance}</p>
        {nextStep ? (
          <div className="mt-1 text-sm leading-6 text-slate-400">{nextStep}</div>
        ) : null}
      </div>
      <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto xl:justify-end">
        {children}
      </div>
    </div>
  );
}
