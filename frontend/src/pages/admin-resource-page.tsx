import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { adminNav } from "@/lib/platform-nav";

export function AdminResourcePage({
  title,
  copy
}: {
  title: string;
  copy: string;
}) {
  return (
    <AppShell title={title} subtitle="Admin operations" navItems={adminNav}>
      <Card className="p-6">
        <p className="text-sm leading-7 text-slate-300">{copy}</p>
      </Card>
    </AppShell>
  );
}
