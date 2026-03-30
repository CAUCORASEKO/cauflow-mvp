import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all duration-200 placeholder:text-slate-500 hover:border-white/15 hover:bg-white/[0.045] focus:border-sky-300/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_1px_rgba(125,211,252,0.18),0_14px_30px_rgba(2,8,23,0.22)]",
        className
      )}
      {...props}
    />
  );
}
