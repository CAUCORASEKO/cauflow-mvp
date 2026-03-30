import type { LicensePolicy } from "@/types/api";

export type LicensePolicyInput = {
  commercialUse: boolean;
  aiTraining: "allowed" | "not_allowed";
  derivativeWorks: "allowed" | "restricted" | "not_allowed";
  attribution: "required" | "optional" | "not_required";
  licenseScope: "non_exclusive" | "exclusive";
  redistribution: "allowed" | "not_allowed";
  usageType: "personal" | "commercial" | "ai" | "editorial";
};

export const DEFAULT_LICENSE_POLICY: LicensePolicyInput = {
  commercialUse: false,
  aiTraining: "not_allowed",
  derivativeWorks: "not_allowed",
  attribution: "not_required",
  licenseScope: "non_exclusive",
  redistribution: "not_allowed",
  usageType: "commercial"
};

export const getLicensePolicyInput = (
  policy?: LicensePolicy | LicensePolicyInput | null
): LicensePolicyInput => ({
  ...DEFAULT_LICENSE_POLICY,
  ...(policy || {})
});

export const generateLicensePolicySummary = (policy: LicensePolicyInput) =>
  [
    policy.commercialUse ? "Commercial use allowed." : "Commercial use not allowed.",
    policy.aiTraining === "allowed"
      ? "AI training allowed."
      : "AI training not allowed.",
    policy.derivativeWorks === "allowed"
      ? "Derivative works allowed."
      : policy.derivativeWorks === "restricted"
        ? "Derivative works restricted."
        : "Derivative works not allowed.",
    policy.attribution === "required"
      ? "Attribution required."
      : policy.attribution === "optional"
        ? "Attribution optional."
        : "Attribution not required.",
    policy.redistribution === "allowed"
      ? "Redistribution allowed."
      : "Redistribution not allowed.",
    policy.licenseScope === "exclusive"
      ? "Exclusive license."
      : "Non-exclusive license."
  ].join(" ");

export const getLicensePolicyBadges = (policy: LicensePolicyInput) =>
  [
    policy.commercialUse ? "Commercial Ready" : "Non-commercial",
    policy.aiTraining === "allowed" ? "AI Allowed" : "AI Restricted",
    policy.attribution === "required" ? "Attribution Required" : null,
    policy.licenseScope === "exclusive" ? "Exclusive" : "Non-exclusive",
    policy.redistribution === "not_allowed" ? "No Redistribution" : "Redistribution Allowed"
  ].filter(Boolean) as string[];
