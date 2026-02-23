export interface ProductSearchRequest {
  keyword: string;
  min_price?: number;
  max_price?: number;
  free_shipping?: boolean;
  sort?: string;
}

export interface SourcingProduct {
  product_no: string;
  name: string;
  price: string;
  image_url: string;
  url: string;
  category: string;
  description: string;
  rating: number;
  review_count: number;
  seller: string;
  shipping_info: string;
}

export interface ProductSearchResponse {
  success: boolean;
  products: SourcingProduct[];
  items: SourcingProduct[];
  message: string;
  search_info: {
    keyword: string;
    sort_option: string;
    requested_max: number;
    actual_count: number;
    total_pages_searched: number;
    market: string;
    search_conditions: Record<string, boolean>;
  };
}
