export interface Asset {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
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
  createdAt: string;
  policy?: LicensePolicy | null;
}

export interface Purchase {
  id: number;
  licenseId: number;
  buyerEmail: string;
  status: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
  error?: string;
}
