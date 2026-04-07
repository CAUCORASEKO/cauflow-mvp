import type {
  Account,
  ApiResponse,
  Asset,
  ExploreFeed,
  License,
  LicenseGrant,
  Pack,
  PaymentRecord,
  Purchase,
  RoleDashboard,
  UserRole
} from "@/types/api";
import type { LicensePolicyInput } from "@/lib/license-policy";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const SESSION_STORAGE_KEY = "cauflow.session.token";

let sessionToken: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(SESSION_STORAGE_KEY) : null;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const getSessionToken = () => sessionToken;

export const setSessionToken = (nextToken: string | null) => {
  sessionToken = nextToken;

  if (typeof window === "undefined") {
    return;
  }

  if (nextToken) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextToken);
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

const getAuthHeaders = (headers?: HeadersInit) => {
  const normalizedHeaders = new Headers(headers);

  if (sessionToken) {
    normalizedHeaders.set("Authorization", `Bearer ${sessionToken}`);
  }

  return normalizedHeaders;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(
      payload.error || payload.message || "Request failed",
      response.status,
      payload.code
    );
  }

  return payload.data;
};

export const getAssetImageUrl = (imageUrl: string | null) => {
  if (!imageUrl) {
    return null;
  }

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("blob:") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }

  return `${BACKEND_ORIGIN}${imageUrl}`;
};

export const fetchAssets = async () => {
  const response = await fetch(`${API_BASE_URL}/assets`, {
    headers: getAuthHeaders()
  });
  return handleResponse<Asset[]>(response);
};

export const fetchAssetById = async (assetId: number) => {
  const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<Asset>(response);
};

export const createAsset = async (input: {
  title: string;
  description: string;
  image?: File | null;
}) => {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);

  if (input.image) {
    formData.append("image", input.image);
  }

  const response = await fetch(`${API_BASE_URL}/assets`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData
  });

  return handleResponse<Asset>(response);
};

export const deleteAsset = async (assetId: number) => {
  const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  return handleResponse<Asset>(response);
};

export const updateAsset = async (
  assetId: number,
  input: {
    title: string;
    description: string;
    image?: File | null;
  }
) => {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);

  if (input.image) {
    formData.append("image", input.image);
  }

  const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: formData
  });

  return handleResponse<Asset>(response);
};

export const fetchLicenses = async () => {
  const response = await fetch(`${API_BASE_URL}/licenses`, {
    headers: getAuthHeaders()
  });
  return handleResponse<License[]>(response);
};

export const fetchLicenseById = async (licenseId: number) => {
  const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<License>(response);
};

export const createLicense = async (input: {
  assetId: number;
  type: string;
  price: number;
  usage: string;
  policy?: LicensePolicyInput | null;
}) => {
  const response = await fetch(`${API_BASE_URL}/licenses`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<License>(response);
};

export const updateLicense = async (
  licenseId: number,
  input: {
    type: string;
    price: number;
    usage: string;
    policy?: LicensePolicyInput | null;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<License>(response);
};

export const deleteLicense = async (licenseId: number) => {
  const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  return handleResponse<License>(response);
};

export const fetchPurchases = async () => {
  const response = await fetch(`${API_BASE_URL}/purchases`, {
    headers: getAuthHeaders()
  });
  return handleResponse<Purchase[]>(response);
};

export const fetchPurchaseById = async (purchaseId: number) => {
  const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<Purchase>(response);
};

export const createPurchase = async (input: {
  licenseId: number;
  buyerEmail: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/purchases`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<Purchase>(response);
};

export const updatePurchase = async (
  purchaseId: number,
  input: {
    buyerEmail: string;
    status?: string;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<Purchase>(response);
};

export const deletePurchase = async (purchaseId: number) => {
  const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  return handleResponse<Purchase>(response);
};

export const getPacks = async () => {
  const response = await fetch(`${API_BASE_URL}/packs`, {
    headers: getAuthHeaders()
  });
  return handleResponse<Pack[]>(response);
};

export const getPackById = async (packId: number) => {
  const response = await fetch(`${API_BASE_URL}/packs/${packId}`, {
    headers: getAuthHeaders()
  });
  return handleResponse<Pack>(response);
};

export const createPack = async (input: {
  title: string;
  description: string;
  coverAssetId: number;
  price: number;
  status: string;
  category: string;
  licenseId?: number | null;
  assetIds: number[];
}) => {
  const response = await fetch(`${API_BASE_URL}/packs`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<Pack>(response);
};

export const updatePack = async (
  packId: number,
  input: {
    title: string;
    description: string;
    coverAssetId: number;
    price: number;
    status: string;
    category: string;
    licenseId?: number | null;
    assetIds: number[];
  }
) => {
  const response = await fetch(`${API_BASE_URL}/packs/${packId}`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<Pack>(response);
};

export const deletePack = async (packId: number) => {
  const response = await fetch(`${API_BASE_URL}/packs/${packId}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  return handleResponse<Pack>(response);
};

export const signUp = async (input: {
  email: string;
  password: string;
  role: UserRole;
  publicDisplayName?: string;
  organizationName?: string;
  studioName?: string;
  country?: string;
  preferredCurrency?: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  const payload = await handleResponse<{
    email: string;
    role: UserRole;
    verificationRequired: boolean;
  }>(response);
  return payload;
};

export const logIn = async (input: { email: string; password: string }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  const payload = await handleResponse<{ user: Account; sessionToken: string }>(response);
  setSessionToken(payload.sessionToken);
  return payload;
};

export const logOut = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: getAuthHeaders()
  });

  const payload = await handleResponse<{ success: boolean }>(response);
  setSessionToken(null);
  return payload;
};

export const fetchCurrentSession = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders()
  });

  return handleResponse<Account>(response);
};

export const requestPasswordReset = async (email: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ email })
  });

  return handleResponse<{ success: boolean }>(response);
};

export const resetPassword = async (token: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ token, password })
  });

  return handleResponse<{ success: boolean }>(response);
};

export const verifyEmail = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ token })
  });

  return handleResponse<{ success: boolean }>(response);
};

export const resendVerificationEmail = async (email?: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(email ? { email } : {})
  });

  return handleResponse<{ success: boolean }>(response);
};

export const fetchAccount = async () => {
  const response = await fetch(`${API_BASE_URL}/account`, {
    headers: getAuthHeaders()
  });

  return handleResponse<Account>(response);
};

export const updateProfile = async (
  input: Partial<Account> & {
    avatarFile?: File | null;
  }
) => {
  let response: Response;

  if (input.avatarFile) {
    const formData = new FormData();

    if (typeof input.publicDisplayName === "string") {
      formData.append("publicDisplayName", input.publicDisplayName);
    }

    formData.append("avatar", input.avatarFile);

    response = await fetch(`${API_BASE_URL}/account/profile`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: formData
    });
  } else {
    const { avatarFile, ...restInput } = input;

    response = await fetch(`${API_BASE_URL}/account/profile`, {
      method: "PATCH",
      headers: getAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(restInput)
    });
  }

  return handleResponse<Account>(response);
};

export const updateBusinessSettings = async (input: Partial<Account>) => {
  const response = await fetch(`${API_BASE_URL}/account/business`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<Account>(response);
};

export const updateLicensingDefaults = async (input: Partial<Account>) => {
  const response = await fetch(`${API_BASE_URL}/account/licensing-defaults`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<Account>(response);
};

export const updateWalletSettings = async (input: Partial<Account>) => {
  const response = await fetch(`${API_BASE_URL}/account/wallet`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<Account>(response);
};

export const closeAccount = async (confirmation: string) => {
  const response = await fetch(`${API_BASE_URL}/account/close`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ confirmation })
  });

  return handleResponse<{ success: boolean }>(response);
};

export const fetchExploreFeed = async () => {
  const response = await fetch(`${API_BASE_URL}/platform/explore`, {
    headers: getAuthHeaders()
  });

  return handleResponse<ExploreFeed>(response);
};

export const fetchRoleDashboard = async () => {
  const response = await fetch(`${API_BASE_URL}/platform/dashboard`, {
    headers: getAuthHeaders()
  });

  return handleResponse<RoleDashboard>(response);
};

export const fetchEntitlements = async () => {
  const response = await fetch(`${API_BASE_URL}/platform/entitlements`, {
    headers: getAuthHeaders()
  });

  return handleResponse<LicenseGrant[]>(response);
};

export const createCheckoutSession = async (input: {
  assetId?: number | null;
  packId?: number | null;
  licenseId: number;
}) => {
  const response = await fetch(`${API_BASE_URL}/payments/checkout-sessions`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  return handleResponse<PaymentRecord>(response);
};

export const fetchCheckoutSession = async (checkoutSessionId: number) => {
  const response = await fetch(`${API_BASE_URL}/payments/checkout-sessions/${checkoutSessionId}`, {
    headers: getAuthHeaders()
  });

  return handleResponse<PaymentRecord>(response);
};

export const completeCheckoutSession = async (
  checkoutSessionId: number,
  status: PaymentRecord["status"] = "paid"
) => {
  const response = await fetch(
    `${API_BASE_URL}/payments/checkout-sessions/${checkoutSessionId}/complete`,
    {
      method: "POST",
      headers: getAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ status })
    }
  );

  return handleResponse<{
    payment: PaymentRecord;
    purchase: Purchase | null;
    grantedLicense: LicenseGrant | null;
  }>(response);
};
