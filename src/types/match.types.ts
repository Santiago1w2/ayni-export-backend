export interface Product {
  name: string;
  quantity: number;
  pricePerKg: number;
  certifications: string[];
  preferredRegion?: string;
}

export interface Importer {
  id: string;
  company: string;
  country: string;
  region: string;
  product: string;
  targetPrice: number;
  minimumQuantity: number;
  requiredCertifications: string[];
}

export interface MatchResult {
  importer: Importer;
  score: number;
  estimatedRevenue: number;
  reasons: string[];
}
