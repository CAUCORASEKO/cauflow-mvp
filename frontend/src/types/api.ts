export type VisualAssetType =
  | "photography"
  | "illustration"
  | "concept_art"
  | "character_design"
  | "environment"
  | "brand_visual";

export type CatalogStatus = "draft" | "published" | "archived";
export type AssetDeliveryStatus = "delivery_ready" | "needs_fixes";
export type AssetReviewStatus = "draft" | "in_review" | "approved" | "rejected";

export interface AssetFileRecord {
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  aspectRatio: string | null;
  resolutionSummary: string | null;
}

export interface AssetDeliveryReadiness {
  isReady: boolean;
  status: AssetDeliveryStatus;
  notes: string[];
  helperText: string;
}

export interface Asset {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  previewImageUrl?: string | null;
  previewFile?: AssetFileRecord | null;
  masterFile?: AssetFileRecord | null;
  deliveryReadiness?: AssetDeliveryReadiness | null;
  reviewStatus: AssetReviewStatus;
  reviewNote?: string | null;
  canPublish?: boolean;
  publishBlockedReasons?: string[];
  buyerVisible?: boolean;
  visualType: VisualAssetType;
  status: CatalogStatus;
  createdAt: string;
  ownerUserId?: number | null;
  creator?: AccountSummary | null;
  monetizationStatus?: PayoutOnboardingStatus;
  monetizationReady?: boolean;
  purchaseBlockedReason?: string | null;
  licenseOptions?: License[];
}

export interface LicensePolicy {
  id: number;
  licenseId?: number;
  commercialUse: boolean;
  aiTraining: "allowed" | "not_allowed";
  derivativeWorks: "allowed" | "restricted" | "not_allowed";
  attribution: "required" | "optional" | "not_required";
  licenseScope: "non_exclusive" | "exclusive";
  redistribution: "allowed" | "not_allowed";
  usageType: "personal" | "commercial" | "ai" | "editorial";
  policyVersion: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface License {
  id: number;
  assetId: number;
  type: string;
  price: number;
  usage: string;
  status: CatalogStatus;
  createdAt: string;
  ownerUserId?: number | null;
  policy?: LicensePolicy | null;
}

export interface AdminLicenseRecord extends License {
  asset?: Asset | null;
  creator?: AccountSummary | null;
  purchaseCount: number;
  activeGrantCount: number;
}

export interface Purchase {
  id: number;
  licenseId: number;
  buyerEmail: string;
  status: string;
  createdAt: string;
  buyerUserId?: number | null;
  creatorUserId?: number | null;
  assetId?: number | null;
  packId?: number | null;
  paymentStatus?: PaymentStatus;
  payment?: PaymentRecord | null;
  license?: License | null;
  asset?: Asset | null;
  pack?: Pack | null;
  creator?: AccountSummary | null;
  buyer?: AccountSummary | null;
}

export type PackStatus = CatalogStatus;

export type PackCategory =
  | "photography"
  | "illustration"
  | "concept_art"
  | "character_design"
  | "environment"
  | "brand_visual"
  | "mixed_visuals"
  | "visual"
  | "brand"
  | "character"
  | "concept"
  | "dataset"
  | "prompt"
  | "mixed";

export interface PackAssetItem {
  id: number;
  packId: number;
  assetId: number;
  position: number;
  createdAt: string;
  asset: Asset;
}

export interface Pack {
  id: number;
  title: string;
  description: string;
  coverAssetId: number;
  price: number;
  status: PackStatus;
  category: PackCategory;
  licenseId: number | null;
  createdAt: string;
  updatedAt: string;
  assetCount: number;
  coverAsset: Asset | null;
  license: License | null;
  assets?: PackAssetItem[];
  ownerUserId?: number | null;
  creator?: AccountSummary | null;
  monetizationStatus?: PayoutOnboardingStatus;
  monetizationReady?: boolean;
  purchaseBlockedReason?: string | null;
}

export type UserRole = "creator" | "buyer" | "admin";

export type AccountStatus = "active" | "suspended" | "restricted" | "closed";

export type PayoutOnboardingStatus =
  | "not_started"
  | "pending"
  | "active"
  | "restricted"
  | "disabled";

export type WalletConnectionStatus = "disconnected" | "connected";

export interface AccountSummary {
  id: number;
  email: string;
  publicDisplayName: string | null;
  organizationName: string | null;
  studioName: string | null;
  payoutOnboardingStatus?: PayoutOnboardingStatus;
}

export interface Account {
  id: number;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  publicDisplayName: string | null;
  avatarUrl: string | null;
  organizationName: string | null;
  studioName: string | null;
  country: string | null;
  preferredCurrency: string | null;
  walletAddress: string | null;
  walletConnectionStatus: WalletConnectionStatus;
  onboardingCompleted?: boolean;
  payoutOnboardingStatus: PayoutOnboardingStatus;
  defaultLicenseType: string | null;
  defaultLicenseUsage: string | null;
  defaultPrice: number | null;
  taxReference: string | null;
  stripeConnectAccountId: string | null;
  creatorReady: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";

export interface PaymentRecord {
  id: number;
  buyerUserId: number;
  creatorUserId: number | null;
  assetId: number | null;
  packId: number | null;
  licenseId: number | null;
  purchaseId: number | null;
  provider: string;
  providerSessionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  receiptUrl: string | null;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
  purchase?: Purchase | null;
  license?: License | null;
  asset?: Asset | null;
  pack?: Pack | null;
  creator?: AccountSummary | null;
}

export interface LicenseGrant {
  id: number;
  purchaseId: number;
  buyerUserId: number;
  creatorUserId: number | null;
  licenseId: number;
  assetId: number | null;
  packId: number | null;
  status: "active" | "expired" | "revoked";
  downloadAccess: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  purchase?: Purchase | null;
  payment?: PaymentRecord | null;
  license?: License | null;
  asset?: Asset | null;
  pack?: Pack | null;
  creator?: AccountSummary | null;
  premiumDelivery?: {
    mode?: "asset" | "pack";
    eligible: boolean;
    available: boolean;
    reason: string | null;
    downloadUrl: string | null;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    resolutionSummary: string | null;
    aspectRatio: string | null;
    includedAssets?: Array<{
      id: number;
      position: number;
      title: string;
      visualType?: VisualAssetType;
      previewImageUrl?: string | null;
      previewFile?: AssetFileRecord | null;
      masterFile?: AssetFileRecord | null;
      premiumDelivery: {
        available: boolean;
        reason: string | null;
        downloadUrl: string | null;
        fileName: string | null;
        mimeType: string | null;
        fileSize: number | null;
        resolutionSummary: string | null;
        aspectRatio: string | null;
      };
    }>;
  } | null;
}

export interface ExploreFeed {
  assets: Asset[];
  packs: Pack[];
  licenses: License[];
}

export interface RoleDashboard {
  role: UserRole;
  account: Account;
  metrics: Record<string, number>;
  payoutStatus?: PayoutOnboardingStatus;
  recentPurchases?: Purchase[];
  recentPayments?: PaymentRecord[];
  quickActions: string[];
}

export interface AdminOverview {
  metrics: {
    totalUsersCount: number;
    assetsCount: number;
    draftAssets: number;
    assetsPendingReview: number;
    rejectedAssetsCount: number;
    publishedAssets: number;
    archivedAssets: number;
    packsCount: number;
    licensesCount: number;
    creatorsCount: number;
    buyersCount: number;
    purchasesCount: number;
    paidPurchasesCount: number;
    pendingPurchasesCount: number;
    activeLicenseGrantsCount: number;
  };
  reviewQueue: Asset[];
  recentPurchases: Purchase[];
}

export interface AdminReviewQueueSnapshot {
  summary: {
    inReviewCount: number;
    deliveryReadyCount: number;
    blockedCount: number;
  };
  assets: Asset[];
}

export interface AdminCatalogSnapshot {
  summary: {
    assetsCount: number;
    assetDraftCount: number;
    assetPublishedCount: number;
    assetArchivedCount: number;
    inReviewCount: number;
    rejectedCount: number;
    packsCount: number;
    licensesCount: number;
  };
  assets: Asset[];
  packs: Pack[];
  licenses: AdminLicenseRecord[];
}

export interface AdminUserRecord {
  id: number;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  publicDisplayName: string | null;
  avatarUrl: string | null;
  organizationName: string | null;
  studioName: string | null;
  country: string | null;
  preferredCurrency: string | null;
  walletConnectionStatus: WalletConnectionStatus;
  onboardingCompleted?: boolean;
  payoutOnboardingStatus?: PayoutOnboardingStatus;
  createdAt: string;
  updatedAt: string;
  assetCount: number;
  packCount: number;
  buyerPurchaseCount: number;
  creatorSaleCount: number;
  entitlementCount: number;
}

export interface AdminUsersSnapshot {
  summary: {
    totalUsers: number;
    creatorsCount: number;
    buyersCount: number;
    adminsCount: number;
    verifiedCount: number;
    closedCount: number;
    restrictedCount: number;
  };
  users: AdminUserRecord[];
}

export interface AdminCommerceRecord extends Purchase {
  grantStatus: LicenseGrant["status"] | null;
  downloadAccess: boolean | null;
}

export interface AdminCommerceSnapshot {
  summary: {
    purchasesCount: number;
    paidPurchasesCount: number;
    pendingPurchasesCount: number;
    refundedPurchasesCount: number;
    activeGrantsCount: number;
  };
  purchases: AdminCommerceRecord[];
}

export interface ApiResponse<T> {
  message: string;
  data: T;
  error?: string;
  code?: string;
}
