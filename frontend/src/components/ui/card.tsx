import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "glass-panel rounded-3xl border border-white/10 bg-slate-950/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
