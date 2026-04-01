import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function AuthPageShell({
  eyebrow,
  title,
  copy,
  footer,
  children
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  copy: string;
  footer?: ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-mesh">
      <div className="shell py-8">
        <Link to="/" className="inline-flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 font-display text-lg font-bold text-sky-200">
            C
          </div>
          <div>
            <p className="font-display text-lg text-white">CauFlow</p>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Licensing platform
            </p>
          </div>
        </Link>
      </div>

      <div className="shell grid min-h-[calc(100vh-112px)] items-center gap-8 py-10 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-6">
          <Badge>{eyebrow}</Badge>
          <h1 className="font-display text-5xl text-white md:text-6xl">{title}</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">{copy}</p>
          {footer}
        </div>

        <Card className="p-6 md:p-8">{children}</Card>
      </div>
    </div>
  );
}
