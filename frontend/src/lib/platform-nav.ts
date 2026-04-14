import type { Account, UserRole } from "@/types/api";

export const creatorNav = [
  { label: "Overview", href: "/app/creator" },
  { label: "Assets", href: "/app/creator/workspace#assets" },
  { label: "Packs", href: "/app/creator/workspace#packs" },
  { label: "Licenses", href: "/app/creator/workspace#licenses" },
  { label: "Sales", href: "/app/creator/sales" },
  { label: "Settings", href: "/app/settings" }
];

export const buyerNav = [
  { label: "Overview", href: "/app/buyer" },
  { label: "Explore", href: "/app/explore" },
  { label: "Purchases", href: "/app/buyer/purchases" },
  { label: "Active licenses", href: "/app/buyer/licenses" },
  { label: "Downloads", href: "/app/buyer/downloads" },
  { label: "Settings", href: "/app/settings" }
];

export const adminNav = [
  { label: "Overview", href: "/app/admin" },
  { label: "Review queue", href: "/app/admin/review" },
  { label: "Catalog", href: "/app/admin/catalog" },
  { label: "Users", href: "/app/admin/users" },
  { label: "Purchases", href: "/app/admin/commerce" }
];

export const getRoleHomePath = (role: UserRole) =>
  role === "creator" ? "/app/creator" : role === "buyer" ? "/app/buyer" : "/app/admin";

export const getAuthenticatedHomePath = (account: Pick<Account, "role" | "emailVerified">) =>
  account.emailVerified ? getRoleHomePath(account.role) : "/verify-email";
