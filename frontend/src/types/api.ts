export interface Asset {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface License {
  id: number;
  assetId: number;
  type: string;
  price: number;
  usage: string;
  createdAt: string;
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
