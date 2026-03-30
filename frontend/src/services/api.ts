import type { ApiResponse, Asset, License, Purchase } from "@/types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const handleResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Request failed");
  }

  return payload.data;
};

export const getAssetImageUrl = (imageUrl: string | null) => {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${BACKEND_ORIGIN}${imageUrl}`;
};

export const fetchAssets = async () => {
  const response = await fetch(`${API_BASE_URL}/assets`);
  return handleResponse<Asset[]>(response);
};

export const fetchAssetById = async (assetId: number) => {
  const response = await fetch(`${API_BASE_URL}/assets/${assetId}`);
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
    body: formData
  });

  return handleResponse<Asset>(response);
};

export const deleteAsset = async (assetId: number) => {
  const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
    method: "DELETE"
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
    body: formData
  });

  return handleResponse<Asset>(response);
};

export const fetchLicenses = async () => {
  const response = await fetch(`${API_BASE_URL}/licenses`);
  return handleResponse<License[]>(response);
};

export const fetchLicenseById = async (licenseId: number) => {
  const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}`);
  return handleResponse<License>(response);
};

export const createLicense = async (input: {
  assetId: number;
  type: string;
  price: number;
  usage: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/licenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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
  }
) => {
  const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return handleResponse<License>(response);
};

export const deleteLicense = async (licenseId: number) => {
  const response = await fetch(`${API_BASE_URL}/licenses/${licenseId}`, {
    method: "DELETE"
  });

  return handleResponse<License>(response);
};

export const fetchPurchases = async () => {
  const response = await fetch(`${API_BASE_URL}/purchases`);
  return handleResponse<Purchase[]>(response);
};

export const fetchPurchaseById = async (purchaseId: number) => {
  const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`);
  return handleResponse<Purchase>(response);
};

export const createPurchase = async (input: {
  licenseId: number;
  buyerEmail: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return handleResponse<Purchase>(response);
};

export const deletePurchase = async (purchaseId: number) => {
  const response = await fetch(`${API_BASE_URL}/purchases/${purchaseId}`, {
    method: "DELETE"
  });

  return handleResponse<Purchase>(response);
};
