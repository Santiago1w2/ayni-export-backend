export interface Company {
  name: string;
  country: string;
  taxId?: string;
  representative?: string;
}

export interface Agreement {
  agreementId: string;
  exporter: Company;
  importer: Company;
  product: string;
  quantityTonnes: number;
  pricePerKg: number;
  currency: string;
  incoterm?: string;
  destination?: string;
  estimatedDelivery?: string;
  notes?: string;
}
