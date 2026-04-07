import { useEffect, useMemo, useState, type FormEvent, type PropsWithChildren } from "react";
import { ArrowUpRight, Building2, CreditCard, ShieldCheck, UserCircle2, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { AvatarUploadField } from "@/components/settings/avatar-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { adminNav, buyerNav, creatorNav } from "@/lib/platform-nav";
import { cn, humanizeLabel } from "@/lib/utils";
import {
  updateBusinessSettings,
  updateLicensingDefaults,
  updateProfile,
  updateWalletSettings
} from "@/services/api";

const payoutStatusCopy = {
  not_started: {
    label: "Not started",
    summary: "Monetization is not enabled yet.",
    detail: "Complete payout onboarding before fully monetizing listings.",
    accent: "border-amber-300/20 bg-amber-300/[0.08] text-amber-100"
  },
  pending: {
    label: "Pending",
    summary: "Payout setup is in progress.",
    detail: "Onboarding is incomplete or still being reviewed.",
    accent: "border-sky-300/20 bg-sky-300/[0.08] text-sky-100"
  },
  active: {
    label: "Active",
    summary: "Ready to receive funds.",
    detail: "Your payout setup is in a healthy state for monetized listings.",
    accent: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100"
  },
  restricted: {
    label: "Restricted",
    summary: "Payout access is limited.",
    detail: "Review the account and resolve outstanding setup or compliance issues.",
    accent: "border-rose-300/20 bg-rose-300/[0.08] text-rose-100"
  },
  disabled: {
    label: "Disabled",
    summary: "Payouts are currently unavailable.",
    detail: "Selling is blocked until payout availability is restored.",
    accent: "border-slate-300/20 bg-slate-300/[0.08] text-slate-100"
  }
} as const;

const walletStatusCopy = {
  connected: {
    label: "Connected",
    detail: "A wallet placeholder is already attached to this account."
  },
  disconnected: {
    label: "Disconnected",
    detail: "Wallet support remains optional and can be connected later."
  }
} as const;

function SettingsSection({
  eyebrow,
  title,
  copy,
  children
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  copy: string;
}>) {
  return (
    <Card className="surface-highlight p-6 md:p-7">
      <div className="mb-6 max-w-3xl space-y-3">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
        <h2 className="font-display text-3xl text-white">{title}</h2>
        <p className="text-sm leading-7 text-slate-300">{copy}</p>
      </div>
      {children}
    </Card>
  );
}

function StatusBadge({
  className,
  children
}: PropsWithChildren<{
  className?: string;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SettingsPage() {
  const { user, updateUser, refreshSession } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState(user?.publicDisplayName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setErrorMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [errorMessage]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileDisplayName(user.publicDisplayName || "");
  }, [user]);

  if (!user) {
    return null;
  }

  const navItems =
    user.role === "creator" ? creatorNav : user.role === "buyer" ? buyerNav : adminNav;

  const payoutState = payoutStatusCopy[user.payoutOnboardingStatus] || payoutStatusCopy.not_started;
  const walletState = walletStatusCopy[user.walletConnectionStatus] || walletStatusCopy.disconnected;

  const monetizationSummary = useMemo(() => {
    if (user.creatorReady) {
      return "Creator monetization is currently ready.";
    }

    if (!user.emailVerified) {
      return "Verify your email before monetized listings can feel fully ready.";
    }

    if (user.payoutOnboardingStatus !== "active") {
      return "Payout onboarding still needs attention before listings are fully monetization-ready.";
    }

    return "Complete the remaining business profile details before fully monetizing listings.";
  }, [user.creatorReady, user.emailVerified, user.payoutOnboardingStatus]);

  const handleSectionSubmit =
    (sectionKey: string, successMessage: string, updater: typeof updateProfile) =>
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSavingSection(sectionKey);
      setErrorMessage(null);
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());

      try {
        const account = await updater(payload);
        updateUser(account);
        await refreshSession();
        setMessage(successMessage);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save changes.");
      } finally {
        setSavingSection(null);
      }
    };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSection("profile");
    setAvatarError(null);
    setErrorMessage(null);

    try {
      const account = await updateProfile({
        publicDisplayName: profileDisplayName,
        avatarFile
      });
      updateUser(account);
      await refreshSession();
      setProfileDisplayName(account.publicDisplayName || "");
      setAvatarFile(null);
      setMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleWalletDisconnect = async () => {
    setSavingSection("wallet");

    try {
      const account = await updateWalletSettings({
        walletAddress: "",
        walletConnectionStatus: "disconnected"
      });
      updateUser(account);
      await refreshSession();
      setMessage("Wallet placeholder disconnected.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update wallet settings.");
    } finally {
      setSavingSection(null);
    }
  };

  if (user.role !== "creator") {
    return (
      <AppShell title="Settings" subtitle="Account and business" navItems={navItems}>
        {message ? <ActionFeedback tone="success" message={message} /> : null}
        {errorMessage ? <ActionFeedback tone="error" message={errorMessage} /> : null}
        <div className="grid gap-5">
          <SettingsSection
            eyebrow="Profile"
            title="Account identity"
            copy="Update the visible account fields used across the current CauFlow experience."
          >
            <form className="space-y-5" onSubmit={handleProfileSubmit}>
              <Input
                name="publicDisplayName"
                value={profileDisplayName}
                onChange={(event) => setProfileDisplayName(event.target.value)}
                placeholder="Public display name"
              />
              <AvatarUploadField
                currentAvatarUrl={user.avatarUrl}
                displayName={profileDisplayName || user.email}
                selectedFile={avatarFile}
                onFileSelect={(file, error) => {
                  setAvatarFile(file);
                  setAvatarError(error || null);
                }}
                error={avatarError}
                disabled={savingSection === "profile"}
              />
              <Button type="submit" disabled={savingSection === "profile" || Boolean(avatarError)}>
                {savingSection === "profile" ? "Saving..." : "Save profile"}
              </Button>
            </form>
          </SettingsSection>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings" subtitle="Creator account and business controls" navItems={navItems}>
      {message ? <ActionFeedback tone="success" message={message} /> : null}
      {errorMessage ? <ActionFeedback tone="error" message={errorMessage} /> : null}

      <div className="grid gap-5">
        <SettingsSection
          eyebrow="Profile"
          title="Creator identity"
          copy="Profile fields define how your creator identity appears across the platform. Keep this section focused on public-facing identity only."
        >
          <form className="space-y-5" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Public display name</label>
                <Input
                  name="publicDisplayName"
                  value={profileDisplayName}
                  onChange={(event) => setProfileDisplayName(event.target.value)}
                  placeholder="How buyers and collaborators will see you"
                />
              </div>
            </div>

            <AvatarUploadField
              currentAvatarUrl={user.avatarUrl}
              displayName={profileDisplayName || user.email}
              selectedFile={avatarFile}
              onFileSelect={(file, error) => {
                setAvatarFile(file);
                setAvatarError(error || null);
              }}
              error={avatarError}
              disabled={savingSection === "profile"}
            />

            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200">
                  <UserCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Public-facing creator identity</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Business details, payout readiness, and licensing defaults are managed separately below.
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={savingSection === "profile" || Boolean(avatarError)}>
                {savingSection === "profile" ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          eyebrow="Business"
          title="Business identity"
          copy="These settings define the commercial identity behind your listings and establish your default pricing and reporting context."
        >
          <form className="space-y-5" onSubmit={handleSectionSubmit("business", "Business settings updated.", updateBusinessSettings)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Studio / business name</label>
                <Input
                  name="organizationName"
                  defaultValue={user.organizationName || ""}
                  placeholder="The studio, brand, or business behind your catalog"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Country</label>
                <Input
                  name="country"
                  defaultValue={user.country || ""}
                  placeholder="Used for business and payout context"
                />
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Preferred currency</label>
                <Input
                  name="preferredCurrency"
                  defaultValue={user.preferredCurrency || "USD"}
                  placeholder="USD"
                />
                <p className="text-sm leading-6 text-slate-400">
                  Used as your default pricing and reporting currency across creator workflows.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Commercial identity foundation</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Keep fiat business preferences here. Wallet connection remains an optional secondary setting below.
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={savingSection === "business"}>
                {savingSection === "business" ? "Saving..." : "Save business"}
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          eyebrow="Payments & payouts"
          title="Payout readiness"
          copy="Payout onboarding is a system state, not a general preference. It determines whether your creator account is ready to receive funds from monetized listings."
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr),minmax(320px,0.85fr)]">
            <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge className={payoutState.accent}>{payoutState.label}</StatusBadge>
                <Badge className={cn(user.creatorReady ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100" : "border-slate-300/20 bg-slate-300/[0.08] text-slate-100")}>
                  {user.creatorReady ? "Ready to monetize" : "Needs attention"}
                </Badge>
              </div>

              <div>
                <p className="font-display text-3xl text-white">{payoutState.summary}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{payoutState.detail}</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Monetization readiness
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{monetizationSummary}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.payoutOnboardingStatus === "active"
                        ? "Review payout setup"
                        : "Complete onboarding"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Required before fully monetizing listings. A real external payout integration can replace the local status override below later.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={() =>
                      document.getElementById("payout-status-control")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                      })
                    }
                  >
                    {user.payoutOnboardingStatus === "active" ? "Review payout setup" : "Complete onboarding"}
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <form
                id="payout-status-control"
                className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5"
                onSubmit={handleSectionSubmit("payouts", "Payout status updated.", updateBusinessSettings)}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Local payout status override
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Temporary development control until CauFlow is wired to a real payout onboarding provider.
                </p>
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-slate-100">Payout onboarding status</label>
                  <Select name="payoutOnboardingStatus" defaultValue={user.payoutOnboardingStatus}>
                    <option value="not_started">{humanizeLabel("not_started")}</option>
                    <option value="pending">{humanizeLabel("pending")}</option>
                    <option value="active">{humanizeLabel("active")}</option>
                    <option value="restricted">{humanizeLabel("restricted")}</option>
                    <option value="disabled">{humanizeLabel("disabled")}</option>
                  </Select>
                </div>
                <div className="mt-4">
                  <Button type="submit" variant="secondary" disabled={savingSection === "payouts"}>
                    {savingSection === "payouts" ? "Saving..." : "Save payout status"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="Licensing defaults"
          title="Licensing defaults"
          copy="These defaults prefill your new licensing flows, so you can set your most common commercial terms once and start from a stronger baseline."
        >
          <form className="space-y-5" onSubmit={handleSectionSubmit("licensing", "Licensing defaults updated.", updateLicensingDefaults)}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Default license type</label>
                <Input
                  name="defaultLicenseType"
                  defaultValue={user.defaultLicenseType || ""}
                  placeholder="Commercial standard"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Default usage</label>
                <Input
                  name="defaultLicenseUsage"
                  defaultValue={user.defaultLicenseUsage || ""}
                  placeholder="Campaign, editorial, AI, or similar"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-100">Default price</label>
                <Input
                  name="defaultPrice"
                  defaultValue={user.defaultPrice || ""}
                  placeholder="Used to prefill common pricing"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Prefill your most common terms</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    These values reduce repeated manual setup whenever you define a new license.
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={savingSection === "licensing"}>
                {savingSection === "licensing" ? "Saving..." : "Save licensing defaults"}
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          eyebrow="Wallet connection"
          title="Optional wallet support"
          copy="Wallet connection is optional and future-facing. Email-based account access remains your primary sign-in method, and standard payout logic remains the main monetization path."
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr),minmax(320px,0.92fr)]">
            <div className="space-y-4 rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge className="border-white/10 bg-white/[0.06] text-white">
                  {walletState.label}
                </StatusBadge>
                <Badge className="border-white/10 bg-white/[0.03] text-slate-200">
                  Optional
                </Badge>
              </div>

              <div>
                <p className="font-display text-3xl text-white">Wallet connection stays secondary.</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{walletState.detail}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  Optional for future wallet-compatible identity or payout workflows. It does not replace email login or your fiat pricing and reporting setup.
                </p>
              </div>

              {user.walletAddress ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Stored wallet address</p>
                  <p className="mt-2 break-all text-sm text-white">{user.walletAddress}</p>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user.walletConnectionStatus === "connected" ? "Disconnect placeholder" : "Wallet support coming soon"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      A real wallet integration can attach here later without changing primary auth or payout architecture.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  {user.walletConnectionStatus === "connected" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={savingSection === "wallet"}
                      onClick={() => void handleWalletDisconnect()}
                    >
                      {savingSection === "wallet" ? "Updating..." : "Disconnect wallet"}
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" disabled>
                      Wallet support coming soon
                    </Button>
                  )}
                </div>
              </div>

              <form
                className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5"
                onSubmit={handleSectionSubmit("wallet", "Wallet placeholder updated.", updateWalletSettings)}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Development placeholder
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Keep backend compatibility without implying a real wallet-native account model.
                </p>
                <div className="mt-4 grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-100">Placeholder wallet address</label>
                    <Input
                      name="walletAddress"
                      defaultValue={user.walletAddress || ""}
                      placeholder="Optional local-only wallet identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-100">Connection status</label>
                    <Select name="walletConnectionStatus" defaultValue={user.walletConnectionStatus}>
                      <option value="disconnected">{humanizeLabel("disconnected")}</option>
                      <option value="connected">{humanizeLabel("connected")}</option>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <Button type="submit" variant="secondary" disabled={savingSection === "wallet"}>
                    {savingSection === "wallet" ? "Saving..." : "Save wallet placeholder"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </SettingsSection>
      </div>
    </AppShell>
  );
}
