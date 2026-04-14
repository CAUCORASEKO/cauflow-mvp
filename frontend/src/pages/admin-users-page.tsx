import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AdminEmptyState, AdminStatCard, AdminStatusPill } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { adminNav } from "@/lib/platform-nav";
import { formatDate } from "@/lib/utils";
import { fetchAdminUsers } from "@/services/api";
import type { AdminUsersSnapshot, AdminUserRecord } from "@/types/api";

const getDisplayName = (user: AdminUserRecord) =>
  user.publicDisplayName || user.organizationName || user.studioName || user.email;

export function AdminUsersPage() {
  const [snapshot, setSnapshot] = useState<AdminUsersSnapshot | null>(null);

  useEffect(() => {
    void fetchAdminUsers().then(setSnapshot);
  }, []);

  return (
    <AppShell title="Users" subtitle="Admin platform oversight" navItems={adminNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Population overview</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Understand who is on the platform, what role they play, and where accounts may need attention.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          This is not a CRM layer. It is operational user visibility for platform health,
          moderation context, and commercial readiness.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <AdminStatCard
          label="Total users"
          value={String(snapshot?.summary.totalUsers ?? 0)}
          detail="Combined creator, buyer, and admin accounts on the platform."
        />
        <AdminStatCard
          label="Creators"
          value={String(snapshot?.summary.creatorsCount ?? 0)}
          detail="Accounts responsible for catalog creation and monetization."
        />
        <AdminStatCard
          label="Buyers"
          value={String(snapshot?.summary.buyersCount ?? 0)}
          detail="Accounts purchasing licenses, packs, and premium deliverables."
        />
        <AdminStatCard
          label="Restricted / closed"
          value={String((snapshot?.summary.restrictedCount ?? 0) + (snapshot?.summary.closedCount ?? 0))}
          detail="Accounts already outside the default active state."
        />
      </section>

      {snapshot?.users.length ? (
        <div className="grid gap-5">
          {snapshot.users.map((user) => (
            <Card key={user.id} className="surface-highlight p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <AdminStatusPill label={user.role} tone={user.role === "admin" ? "info" : "neutral"} />
                    <AdminStatusPill
                      label={user.accountStatus}
                      tone={
                        user.accountStatus === "active"
                          ? "success"
                          : user.accountStatus === "restricted"
                            ? "warning"
                            : user.accountStatus === "closed"
                              ? "danger"
                              : "neutral"
                      }
                    />
                    <AdminStatusPill
                      label={user.emailVerified ? "Email verified" : "Email unverified"}
                      tone={user.emailVerified ? "success" : "warning"}
                    />
                    {user.role === "creator" ? (
                      <AdminStatusPill
                        label={`Payout ${user.payoutOnboardingStatus || "not_started"}`}
                        tone={user.payoutOnboardingStatus === "active" ? "success" : "warning"}
                      />
                    ) : null}
                  </div>
                  <h2 className="mt-3 font-display text-2xl text-white">{getDisplayName(user)}</h2>
                  <p className="mt-2 text-sm text-slate-400">{user.email}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Joined {formatDate(user.createdAt)}
                    {user.country ? ` · ${user.country}` : ""}
                    {user.preferredCurrency ? ` · ${user.preferredCurrency}` : ""}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-5 xl:w-[620px]">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Assets</p>
                    <p className="mt-2 text-white">{user.assetCount}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Packs</p>
                    <p className="mt-2 text-white">{user.packCount}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Buyer purchases</p>
                    <p className="mt-2 text-white">{user.buyerPurchaseCount}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Creator sales</p>
                    <p className="mt-2 text-white">{user.creatorSaleCount}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Entitlements</p>
                    <p className="mt-2 text-white">{user.entitlementCount}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <AdminEmptyState
          title="No users found."
          copy="Platform accounts will appear here once users begin signing up and operating on CauFlow."
        />
      )}
    </AppShell>
  );
}
