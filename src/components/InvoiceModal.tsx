import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertTriangle, Lock } from 'lucide-react';
import { Invoice, InvoiceLineItem, InvoiceStatus, ProductItem, VillaClient } from '../types';
import { formatRupiah } from '../utils/formatters';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  clients: VillaClient[];
  invoices: Invoice[];
  editingInvoice?: Invoice | null;
  isProfitUnlocked: boolean;
  onRequestUnlockProfit: () => void;
  onCreateInvoice: (invoice: Invoice, newClient?: VillaClient) => void;
  onUpdateInvoice?: (invoice: Invoice) => void;
}

interface DraftLine {
  productId: string; // 'MANUAL' if manual custom item
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
  unitPrice: number;
}

export function generateDailyInvoiceNumber(
  dateStr: string,
  invoices: Invoice[],
  excludeInvoiceId?: string
): string {
  const cleanDate = (dateStr || new Date().toISOString().split('T')[0]).split('T')[0];
  const formattedDate = cleanDate.replace(/-/g, '/'); // YYYY/MM/DD
  const sameDayCount = invoices.filter(
    (inv) => inv.issueDate === cleanDate && inv.id !== excludeInvoiceId
  ).length;
  const sequence = String(sameDayCount + 1).padStart(3, '0');
  return `INV/${formattedDate}/${sequence}`;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  products,
  clients,
  invoices,
  editingInvoice,
  isProfitUnlocked,
  onRequestUnlockProfit,
  onCreateInvoice,
  onUpdateInvoice,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isCustomInvNumber, setIsCustomInvNumber] = useState(false);
  const [issueDate, setIssueDate] = useState(todayStr);
  const [villaMode, setVillaMode] = useState<'EXISTING' | 'MANUAL'>('EXISTING');
  const [selectedVillaId, setSelectedVillaId] = useState<string>(clients[0]?.id || '');
  const [manualVillaName, setManualVillaName] = useState('');
  const [manualVillaAddress, setManualVillaAddress] = useState('Bali');
  const [manualVillaContact, setManualVillaContact] = useState('Manajemen Villa');
  const [manualVillaPhone, setManualVillaPhone] = useState('');

  const [status, setStatus] = useState<InvoiceStatus>('UNPAID');
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setIsCustomInvNumber(true);
      setIssueDate(editingInvoice.issueDate);
      setVillaMode('MANUAL');
      setManualVillaName(editingInvoice.villaName);
      setManualVillaAddress(editingInvoice.villaAddress || editingInvoice.villaArea || '');
      setManualVillaContact(editingInvoice.villaContact || 'Manajemen Villa');
      setStatus(editingInvoice.status);
      setDpAmount(editingInvoice.paidAmount || 0);
      setDiscountAmount(editingInvoice.discountAmount || 0);
      setTaxRate(editingInvoice.taxRate || 0);
      setLines(
        editingInvoice.items.map((it) => {
          const matchedProd = products.find((p) => p.id === it.productId);
          return {
            productId: matchedProd ? matchedProd.id : 'MANUAL',
            name: it.name,
            unit: it.unit,
            quantity: it.quantity,
            costPrice: it.costPriceAtSale,
            unitPrice: it.unitPrice,
          };
        })
      );
    } else {
      setIssueDate(todayStr);
      setIsCustomInvNumber(false);
      setInvoiceNumber(generateDailyInvoiceNumber(todayStr, invoices));
      setVillaMode('EXISTING');
      setSelectedVillaId(clients[0]?.id || '');
      setManualVillaName('');
      setManualVillaAddress('Canggu, Bali');
      setManualVillaContact('Manajemen Villa');
      setManualVillaPhone('');
      setStatus('UNPAID');
      setDpAmount(0);
      setDiscountAmount(0);
      setTaxRate(0);
      const firstProd = products[0];
      setLines(
        firstProd
          ? [
              {
                productId: firstProd.id,
                name: firstProd.name,
                unit: firstProd.unit,
                quantity: 5,
                costPrice: firstProd.costPrice,
                unitPrice: firstProd.sellPrice,
              },
            ]
          : [
              {
                productId: 'MANUAL',
                name: '',
                unit: 'Pcs',
                quantity: 1,
                costPrice: 0,
                unitPrice: 0,
              },
            ]
      );
    }
  }, [isOpen, editingInvoice, invoices, products, clients, todayStr]);

  if (!isOpen) return null;

  const handleProductSelect = (index: number, productId: string) => {
    if (productId === 'MANUAL') {
      setLines((prev) =>
        prev.map((line, i) =>
          i === index
            ? {
                ...line,
                productId: 'MANUAL',
                name: line.name || 'Barang Custom / Manual',
                unit: line.unit || 'Pcs',
              }
            : line
        )
      );
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const specParts: string[] = [];
    if (prod.threadCount && !prod.name.toLowerCase().includes(prod.threadCount.toLowerCase())) {
      specParts.push(prod.threadCount);
    }
    if (prod.size && !prod.name.toLowerCase().includes(prod.size.toLowerCase())) {
      specParts.push(`Uk. ${prod.size}`);
    }
    const displayProdName =
      specParts.length > 0 ? `${prod.name} (${specParts.join(' - ')})` : prod.name;
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              productId: prod.id,
              name: displayProdName,
              unit: prod.unit,
              quantity: Math.max(1, line.quantity || 1),
              costPrice: prod.costPrice,
              unitPrice: prod.sellPrice,
            }
          : line
      )
    );
  };

  const addWarehouseLine = () => {
    const firstProd = products.find((p) => !lines.some((l) => l.productId === p.id)) || products[0];
    if (firstProd) {
      const specParts: string[] = [];
      if (
        firstProd.threadCount &&
        !firstProd.name.toLowerCase().includes(firstProd.threadCount.toLowerCase())
      ) {
        specParts.push(firstProd.threadCount);
      }
      if (
        firstProd.size &&
        !firstProd.name.toLowerCase().includes(firstProd.size.toLowerCase())
      ) {
        specParts.push(`Uk. ${firstProd.size}`);
      }
      const displayProdName =
        specParts.length > 0 ? `${firstProd.name} (${specParts.join(' - ')})` : firstProd.name;
      setLines((prev) => [
        ...prev,
        {
          productId: firstProd.id,
          name: displayProdName,
          unit: firstProd.unit,
          quantity: 1,
          costPrice: firstProd.costPrice,
          unitPrice: firstProd.sellPrice,
        },
      ]);
    } else {
      addManualLine();
    }
  };

  const addManualLine = () => {
    setLines((prev) => [
      ...prev,
      {
        productId: 'MANUAL',
        name: 'Item Manual',
        unit: 'Pcs',
        quantity: 1,
        costPrice: 0,
        unitPrice: 50000,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const detailedItems = lines.map((line, idx) => {
    const prod = line.productId !== 'MANUAL' ? products.find((p) => p.id === line.productId) : undefined;
    const prevQtyInEditedInvoice = editingInvoice
      ? editingInvoice.items
          .filter((it) => it.productId === line.productId)
          .reduce((s, it) => s + it.quantity, 0)
      : 0;
    const availableStock = prod ? prod.stock + prevQtyInEditedInvoice : 999999;
    const subtotal = line.quantity * line.unitPrice;
    const totalCost = line.quantity * line.costPrice;

    return {
      productId: prod ? prod.id : `manual-${idx}-${Date.now()}`,
      sku: prod ? prod.sku : 'MANUAL',
      name: line.name,
      unit: line.unit || 'Pcs',
      quantity: line.quantity,
      costPriceAtSale: line.costPrice,
      unitPrice: line.unitPrice,
      subtotal,
      totalCost,
      itemProfit: subtotal - totalCost,
      availableStock,
      isManual: !prod,
    };
  });

  const subtotalTagihan = detailedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = Math.round(((subtotalTagihan - discountAmount) * Math.max(0, taxRate)) / 100);
  const totalTagihan = Math.max(0, subtotalTagihan - discountAmount + taxAmount);
  const totalModalHPP = detailedItems.reduce((sum, item) => sum + item.totalCost, 0);
  const untungBersih = totalTagihan - totalModalHPP;
  const marginPct = totalTagihan > 0 ? (untungBersih / totalTagihan) * 100 : 0;

  const stockViolations = detailedItems.filter(
    (item) => !item.isManual && item.quantity > item.availableStock
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (stockViolations.length > 0) {
      setErrorMsg(
        `Stok gudang tidak cukup untuk: ${stockViolations
          .map((v) => `${v.name} (Maksimal: ${v.availableStock} ${v.unit})`)
          .join(', ')}`
      );
      return;
    }

    let villaId = editingInvoice?.villaId || `villa-${Date.now()}`;
    let villaName = manualVillaName.trim();
    let villaArea = manualVillaAddress.trim() || 'Bali';
    let villaAddress = manualVillaAddress.trim() || 'Bali';
    let villaContact = manualVillaContact.trim() || 'Manajemen Villa';
    let createdClient: VillaClient | undefined;

    if (villaMode === 'EXISTING') {
      const targetVilla = clients.find((c) => c.id === selectedVillaId) || clients[0];
      if (!targetVilla) {
        setErrorMsg('Pilih pelanggan villa terlebih dahulu.');
        return;
      }
      villaId = targetVilla.id;
      villaName = targetVilla.name;
      villaArea = targetVilla.area;
      villaAddress = targetVilla.address;
      villaContact = targetVilla.contactPerson;
    } else {
      if (!villaName) {
        setErrorMsg('Mohon isi Nama Pelanggan Villa.');
        return;
      }
      if (!editingInvoice) {
        createdClient = {
          id: villaId,
          name: villaName,
          area: villaArea,
          contactPerson: villaContact,
          phone: manualVillaPhone.trim() || '-',
          email: '-',
          address: villaAddress,
          paymentTermsDays: 0,
        };
      }
    }

    const cleanItems: InvoiceLineItem[] = detailedItems.map(
      ({ availableStock, isManual, ...rest }) => rest
    );

    const resolvedPaidAmount =
      status === 'PAID'
        ? totalTagihan
        : status === 'PARTIAL'
        ? Math.min(totalTagihan, Math.max(0, dpAmount))
        : 0;

    const resolvedStatus: InvoiceStatus =
      status === 'PARTIAL' && resolvedPaidAmount >= totalTagihan && totalTagihan > 0
        ? 'PAID'
        : status === 'PARTIAL' && resolvedPaidAmount <= 0
        ? 'UNPAID'
        : status;

    const finalInvoice: Invoice = {
      id: editingInvoice ? editingInvoice.id : `inv-${Date.now()}`,
      invoiceNumber:
        invoiceNumber.trim() ||
        generateDailyInvoiceNumber(issueDate, invoices, editingInvoice?.id),
      villaId,
      villaName,
      villaArea,
      villaAddress,
      villaContact,
      issueDate,
      dueDate: issueDate,
      status: resolvedStatus,
      items: cleanItems,
      subtotal: subtotalTagihan,
      discountAmount,
      taxRate,
      taxAmount,
      shippingCost: 0,
      operationalCost: 0,
      totalAmount: totalTagihan,
      paidAmount: resolvedPaidAmount,
      totalCostOfGoods: totalModalHPP,
      netProfit: untungBersih,
      profitMarginPct: marginPct,
      notes: editingInvoice?.notes || 'Barang diterima dalam kondisi baik.',
      paidDate: resolvedStatus === 'PAID' ? issueDate : undefined,
    };

    if (editingInvoice && onUpdateInvoice) {
      onUpdateInvoice(finalInvoice);
    } else {
      onCreateInvoice(finalInvoice, createdClient);
    }
    onClose();
  };

  const remainingBalance = Math.max(
    0,
    totalTagihan - (status === 'PAID' ? totalTagihan : status === 'PARTIAL' ? dpAmount : 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editingInvoice ? `Edit Manual Invoice (${editingInvoice.invoiceNumber})` : 'Buat Invoice Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              Semua kolom (Nomor Invoice, Tanggal, Villa, Nama Barang, Satuan, Harga & Modal) bisa dipilih otomatis atau diketik manual.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[84vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Baris 1: Nomor Invoice, Tanggal Terbit, Status Pembayaran (Tanpa Jatuh Tempo) */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nomor Invoice (Tanggal & Urutan Hari Ini)
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    setIsCustomInvNumber(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tanggal Terbit Invoice
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setIssueDate(newDate);
                    if (!isCustomInvNumber) {
                      setInvoiceNumber(
                        generateDailyInvoiceNumber(newDate, invoices, editingInvoice?.id)
                      );
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Status Pembayaran
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as InvoiceStatus;
                    setStatus(nextStatus);
                    if (nextStatus === 'PARTIAL' && dpAmount <= 0 && totalTagihan > 0) {
                      setDpAmount(Math.round(totalTagihan * 0.5));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="UNPAID">Belum Dibayar</option>
                  <option value="PARTIAL">Bayar DP (Uang Muka / Sebagian)</option>
                  <option value="PAID">Lunas (100%)</option>
                </select>
              </div>
            </div>

            {status === 'PARTIAL' && (
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nominal Pembayaran DP / Uang Muka (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={totalTagihan}
                    step={5000}
                    value={dpAmount}
                    onChange={(e) =>
                      setDpAmount(Math.min(totalTagihan, Math.max(0, Number(e.target.value))))
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums font-bold bg-white border border-amber-400 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-4 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDpAmount(Math.round(totalTagihan * 0.3))}
                    className="px-2.5 py-2 text-xs font-semibold bg-white hover:bg-amber-100 text-slate-800 border border-slate-300 rounded-lg whitespace-nowrap shrink-0"
                  >
                    DP 30%
                  </button>
                  <button
                    type="button"
                    onClick={() => setDpAmount(Math.round(totalTagihan * 0.5))}
                    className="px-2.5 py-2 text-xs font-semibold bg-white hover:bg-amber-100 text-slate-800 border border-slate-300 rounded-lg whitespace-nowrap shrink-0"
                  >
                    DP 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setDpAmount(Math.round(totalTagihan * 0.7))}
                    className="px-2.5 py-2 text-xs font-semibold bg-white hover:bg-amber-100 text-slate-800 border border-slate-300 rounded-lg whitespace-nowrap shrink-0"
                  >
                    DP 70%
                  </button>
                </div>
                <div className="sm:col-span-3 text-right">
                  <div className="text-xs text-slate-600">Sisa Tagihan Setelah DP</div>
                  <div className="text-sm font-mono tabular-nums font-bold text-amber-900">
                    {formatRupiah(remainingBalance)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Baris 2: Informasi Pelanggan Villa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Ditagihkan Kepada (Pelanggan Villa)
              </label>
              <button
                type="button"
                onClick={() => setVillaMode(villaMode === 'EXISTING' ? 'MANUAL' : 'EXISTING')}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                {villaMode === 'EXISTING'
                  ? 'Ketik Manual Nama & Alamat Villa'
                  : 'Pilih dari Daftar Villa Tersimpan'}
              </button>
            </div>

            {villaMode === 'EXISTING' ? (
              <select
                value={selectedVillaId}
                onChange={(e) => setSelectedVillaId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.address} (PIC: {c.contactPerson})
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Nama Villa / Perusahaan *"
                  value={manualVillaName}
                  onChange={(e) => setManualVillaName(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Alamat Lengkap Villa"
                  value={manualVillaAddress}
                  onChange={(e) => setManualVillaAddress(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Nama PIC / Penerima"
                  value={manualVillaContact}
                  onChange={(e) => setManualVillaContact(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Baris 3: Daftar Barang (Stok Gudang atau Ketik Manual) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800">
                Daftar Barang / Deskripsi Tagihan
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addWarehouseLine}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Pilih dari Stok Gudang</span>
                </button>
                <button
                  type="button"
                  onClick={addManualLine}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Ketik Barang Manual</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3">Sumber / Nama Barang (Bisa Diedit Manual)</th>
                    <th className="py-2.5 px-2 text-center w-20">Qty</th>
                    <th className="py-2.5 px-2 text-center w-24">Satuan</th>
                    <th className="py-2.5 px-2 text-right w-36">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-right w-32">Subtotal</th>
                    <th className="py-2.5 px-2 w-9"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {lines.map((line, idx) => {
                    const item = detailedItems[idx];
                    const isOver = item && !item.isManual && item.quantity > item.availableStock;
                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 space-y-1.5">
                          <select
                            value={line.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                          >
                            <option value="MANUAL">-- Ketik Manual / Custom --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                Stok Gudang: {p.name}
                                {p.threadCount ? ` [${p.threadCount}]` : ''}
                                {p.size ? ` [Uk: ${p.size}]` : ''} (Sisa: {p.stock} {p.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Nama / Deskripsi Barang di Invoice"
                            value={line.name}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, name: e.target.value } : l))
                              )
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-2 text-center align-bottom">
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, quantity: Math.max(1, Number(e.target.value)) } : l
                                )
                              )
                            }
                            className={`w-20 px-2 py-1.5 text-center font-mono tabular-nums border rounded ${
                              isOver ? 'border-red-500 bg-red-50' : 'border-slate-300'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2 text-center align-bottom">
                          <input
                            type="text"
                            value={line.unit}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l, i) => (i === idx ? { ...l, unit: e.target.value } : l))
                              )
                            }
                            className="w-24 px-2 py-1.5 text-center border border-slate-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-2 text-right align-bottom">
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={line.unitPrice}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l, i) =>
                                  i === idx ? { ...l, unitPrice: Math.max(0, Number(e.target.value)) } : l
                                )
                              )
                            }
                            className="w-32 px-2 py-1.5 text-right font-mono tabular-nums border border-slate-300 rounded"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 align-bottom">
                          {item ? formatRupiah(item.subtotal) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center align-bottom">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            disabled={lines.length <= 1}
                            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Baris 4: Diskon & PPN Opsional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Potongan Diskon (Rp) — Opsional
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PPN (%) — Opsional (Isi 0 jika tanpa PPN)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Baris 5: Ringkasan Total Tagihan Invoice */}
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-600">Total Tagihan Invoice</div>
              <div className="text-2xl font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                {formatRupiah(totalTagihan)}
              </div>
              {status === 'PARTIAL' && dpAmount > 0 && (
                <div className="text-xs font-mono tabular-nums text-amber-800 font-semibold mt-0.5">
                  DP Dibayar: {formatRupiah(dpAmount)} · Sisa Tagihan: {formatRupiah(remainingBalance)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>{editingInvoice ? 'Simpan Perubahan' : 'Simpan Invoice'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
