import type { OfferClass } from "@/types/api";

export const formatOfferClass = (value: OfferClass) =>
  value === "free_use" ? "Free use" : "Premium";

export const getOfferClassBadgeClassName = (value: OfferClass) =>
  value === "free_use"
    ? "border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-100"
    : "border-sky-300/18 bg-sky-300/[0.08] text-sky-100";

export const getOfferClassDescription = (value: OfferClass) =>
  value === "free_use"
    ? "Visible in buyer surfaces at zero cost. No premium delivery promise."
    : "Reviewed, quality-gated commercial licensing with premium delivery eligibility.";
