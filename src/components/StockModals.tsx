import React, { useState, useEffect } from 'react';
import { X, PackagePlus, ArrowUpDown, Check } from 'lucide-react';
import {
  PRODUCT_CATEGORIES,
  ProductCategory,
  ProductItem,
  StockMovementType,
  THREAD_COUNT_OPTIONS,
  ThreadCountOption,
} from '../types';
import { formatPercent, formatRupiah } from '../utils/formatters';

const CATEGORIES: ProductCategory[] = PRODUCT_CATEGORIES;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: ProductItem | null;
  onSaveProduct: (product: ProductItem, isNew: boolean) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  onSaveProduct,
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Duvet');
  const [threadCount, setThreadCount] = useState<ThreadCountOption>('');
  const [size, setSize] = useState<string>('');
  const [unit, setUnit] = useState('Pcs');
  const [costPrice, setCostPrice] = useState<number>(100000);
  const [sellPrice, setSellPrice] = useState<number>(150000);
  const [stock, setStock] = useState<number>(20);
  const [minStock, setMinStock] = useState<number>(10);
  const [supplierSource, setSupplierSource] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setSku(editingProduct.sku);
      setName(editingProduct.name);
      setCategory(editingProduct.category);
      setThreadCount(editingProduct.threadCount || '');
      setSize(editingProduct.size || '');
      setUnit(editingProduct.unit);
      setCostPrice(editingProduct.costPrice);
      setSellPrice(editingProduct.sellPrice);
      setStock(editingProduct.stock);
      setMinStock(editingProduct.minStock);
      setSupplierSource(editingProduct.supplierSource);
    } else {
      const randomNum = Math.floor(100 + Math.random() * 900);
      setSku(`BRG-VLA-${randomNum}`);
      setName('');
      setCategory('Duvet');
      setThreadCount('');
      setSize('');
      setUnit('Pcs');
      setCostPrice(100000);
      setSellPrice(150000);
      setStock(25);
      setMinStock(10);
      setSupplierSource('Distributor Utama Denpasar');
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const unitProfit = sellPrice - costPrice;
  const marginPct = sellPrice > 0 ? (unitProfit / sellPrice) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const saved: ProductItem = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      sku: sku.trim().toUpperCase() || 'SKU-001',
      name: name.trim(),
      category,
      threadCount: threadCount || '',
      size: size.trim() || '',
      unit: unit.trim() || 'Pcs',
      costPrice: Math.max(0, costPrice),
      sellPrice: Math.max(0, sellPrice),
      stock: Math.max(0, stock),
      minStock: Math.max(0, minStock),
      supplierSource: supplierSource.trim() || '-',
      updatedAt: todayStr,
    };

    onSaveProduct(saved, !editingProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              {editingProduct ? 'Edit Data Barang & HPP' : 'Tambah Barang Baru ke Gudang'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode SKU</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Suplai Villa</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opsi TC 200, 300, 400 & Ukuran Manual (Tidak Wajib Diisi / Opsional) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Opsi Thread Count / TC (Opsional — Tidak Wajib Diisi)
                </label>
                <span className="text-[11px] text-slate-400">Boleh dikosongkan</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setThreadCount('')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    !threadCount
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Tanpa TC
                </button>
                {THREAD_COUNT_OPTIONS.map((tcOption) => (
                  <button
                    key={tcOption}
                    type="button"
                    onClick={() => setThreadCount(threadCount === tcOption ? '' : tcOption)}
                    className={`py-2 px-2.5 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      threadCount === tcOption
                        ? 'bg-[#0284C7] text-white border-[#0284C7]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-sky-50'
                    }`}
                  >
                    {tcOption}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Ukuran Barang (Opsional — Ketik Manual / Tidak Wajib Diisi)
                </label>
                <span className="text-[11px] text-slate-400">Boleh diisi atau dikosongkan</span>
              </div>
              <input
                type="text"
                placeholder="Contoh: 180x200 cm / 200x200 cm / King Size / 70x140 cm (Opsional)"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Barang & Spesifikasi *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Handuk Bath Mat Keset Kaki 50x75cm 700 GSM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Jual</label>
              <input
                type="text"
                required
                placeholder="Pcs / Jerigen 5L / Box"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingProduct ? 'Stok Saat Ini' : 'Stok Awal Gudang'}
              </label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Minimum Alert</label>
              <input
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Pricing & Profit Margin Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Beli / Modal (HPP) per Unit (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Jual Standar ke Villa (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-600">Keuntungan Kotor per {unit || 'Unit'}:</span>
              <span
                className={`font-mono tabular-nums font-bold ${
                  unitProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {unitProfit >= 0 ? '+' : ''}
                {formatRupiah(unitProfit)} ({formatPercent(marginPct)})
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sumber Pabrik / Distributor</label>
            <input
              type="text"
              placeholder="Contoh: Pabrik Tekstil Bandung / Distributor Kimia Surabaya"
              value={supplierSource}
              onChange={(e) => setSupplierSource(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              Simpan Data Barang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  products: ProductItem[];
  onConfirmMovement: (
    productId: string,
    type: StockMovementType,
    quantity: number,
    newCostPrice: number,
    reference: string,
    notes: string,
    date?: string
  ) => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  onClose,
  product,
  products,
  onConfirmMovement,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [movementType, setMovementType] = useState<StockMovementType>('IN');
  const [quantity, setQuantity] = useState<number>(20);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [movementDate, setMovementDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [reference, setReference] = useState<string>('PO-RESTOK-GUDANG');
  const [notes, setNotes] = useState<string>('Penambahan stok barang masuk ke gudang');

  useEffect(() => {
    const target = product || products[0];
    if (target) {
      setSelectedProductId(target.id);
      setUnitCost(target.costPrice);
      setQuantity(Math.max(10, target.minStock));
      setMovementType('IN');
      setMovementDate(new Date().toISOString().split('T')[0]);
      setReference(`PO-${new Date().toISOString().slice(5, 10).replace('-', '')}`);
      setNotes(`Penambahan stok masuk dari ${target.supplierSource}`);
    }
  }, [product, products, isOpen]);

  if (!isOpen) return null;

  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];
  if (!activeProduct) return null;

  const projectedStock =
    movementType === 'IN'
      ? activeProduct.stock + quantity
      : movementType === 'OUT'
      ? Math.max(0, activeProduct.stock - quantity)
      : Math.max(0, quantity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0 && movementType !== 'ADJUST') return;
    onConfirmMovement(
      activeProduct.id,
      movementType,
      quantity,
      unitCost,
      reference.trim() || 'MUTASI-STOK',
      notes.trim(),
      movementDate || new Date().toISOString().split('T')[0]
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">Catat Penambahan & Pengurangan Barang</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Barang</label>
            <select
              value={activeProduct.id}
              onChange={(e) => {
                const found = products.find((p) => p.id === e.target.value);
                if (found) {
                  setSelectedProductId(found.id);
                  setUnitCost(found.costPrice);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name} (Stok: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Segmented Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Mutasi Stok</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMovementType('IN');
                  setNotes(`Restok masuk dari ${activeProduct.supplierSource}`);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  movementType === 'IN' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Stok Masuk (Restok)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementType('OUT');
                  setNotes('Pengeluaran sampel / barang rusak');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  movementType === 'OUT' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                - Stok Keluar Non-Inv
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementType('ADJUST');
                  setQuantity(activeProduct.stock);
                  setNotes('Penyesuaian Stock Opname fisik gudang');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  movementType === 'ADJUST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                = Koreksi Opname
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {movementType === 'ADJUST' ? 'Stok Fisik Sebenarnya' : `Jumlah (${activeProduct.unit})`}
              </label>
              <input
                type="number"
                min={movementType === 'ADJUST' ? 0 : 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Modal Beli / HPP (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono tabular-nums">
            <div>
              <span className="font-sans text-slate-500">Stok Sebelum: </span>
              <span className="font-semibold text-slate-800">
                {activeProduct.stock} {activeProduct.unit}
              </span>
            </div>
            <div>→</div>
            <div>
              <span className="font-sans text-slate-500">Stok Sesudah: </span>
              <span className="font-bold text-teal-800">
                {projectedStock} {activeProduct.unit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mutasi *
              </label>
              <input
                type="date"
                required
                value={movementDate}
                onChange={(e) => setMovementDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">No. Referensi / PO</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Alasan Penambahan atau Pengurangan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4" />
              Konfirmasi Mutasi Stok
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
