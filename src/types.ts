export type ProductCategory =
  | 'Duvet'
  | 'Sheet'
  | 'Flat Sheet'
  | 'Pillow Case'
  | 'Towel'
  | 'Hand Towel'
  | 'Linen & Handuk'
  | 'Amenities Kamar Mandi'
  | 'Kimia Kolam & Taman'
  | 'Housekeeping & Pembersih'
  | 'F&B & Pantry Villa';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Duvet',
  'Sheet',
  'Flat Sheet',
  'Pillow Case',
  'Towel',
  'Hand Towel',
  'Linen & Handuk',
  'Amenities Kamar Mandi',
  'Kimia Kolam & Taman',
  'Housekeeping & Pembersih',
  'F&B & Pantry Villa',
];

export type ThreadCountOption = '' | 'TC 200' | 'TC 300' | 'TC 400';

export const THREAD_COUNT_OPTIONS: ('TC 200' | 'TC 300' | 'TC 400')[] = [
  'TC 200',
  'TC 300',
  'TC 400',
];

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  threadCount?: ThreadCountOption; // Opsional: TC 200, TC 300, atau TC 400 (tidak wajib diisi)
  size?: string; // Opsional: Ukuran barang manual (misal: 180x200 cm, King, 70x140 cm) - tidak wajib diisi
  unit: string;
  costPrice: number; // Harga Pokok Pembelian (HPP / Modal per unit)
  sellPrice: number; // Harga Jual standar ke Villa
  stock: number;
  minStock: number;
  supplierSource: string;
  updatedAt: string;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST';

export interface StockMovement {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  reference: string;
  date: string;
  notes: string;
}

export interface VillaClient {
  id: string;
  name: string;
  area: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTermsDays: number;
}

export interface InvoiceLineItem {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  costPriceAtSale: number; // HPP saat barang terjual (mengunci perhitungan laba historis)
  unitPrice: number; // Harga jual ke villa
  subtotal: number;
  totalCost: number;
  itemProfit: number;
}

export type InvoiceStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  villaId: string;
  villaName: string;
  villaArea: string;
  villaAddress: string;
  villaContact: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxRate: number; // misal 0 atau 11 (%)
  taxAmount: number;
  shippingCost: number; // Biaya pengiriman yang ditagihkan ke klien
  operationalCost: number; // Biaya operasional/bensin kurir internal yang mengurangi laba bersih
  totalAmount: number;
  paidAmount: number;
  totalCostOfGoods: number; // Total HPP seluruh barang dalam invoice
  netProfit: number; // Keuntungan bersih = (subtotal - discountAmount + shippingCost) - totalCostOfGoods - operationalCost
  profitMarginPct: number;
  notes: string;
  paymentMethod?: string;
  paidDate?: string;
}

export interface SupplierProfile {
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  socialMedia: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  signeeName: string;
  signeeRole: string;
  accessPassword?: string;
}
