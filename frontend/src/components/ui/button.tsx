import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-white text-slate-950 shadow-[0_20px_40px_rgba(255,255,255,0.18)] hover:-translate-y-px hover:bg-slate-100 hover:shadow-[0_24px_44px_rgba(255,255,255,0.2)] active:translate-y-0",
  secondary:
    "border border-white/15 bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-px hover:border-white/20 hover:bg-white/10 hover:text-white active:translate-y-0",
  ghost:
    "text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/[0.08]"
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
