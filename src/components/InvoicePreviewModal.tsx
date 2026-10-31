import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  Truck,
  FileText,
  RotateCcw,
  Send,
  Edit3,
  Check,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { Invoice, InvoiceLineItem, InvoiceStatus, SupplierProfile } from '../types';
import { formatPercent, formatRupiah } from '../utils/formatters';
import { DocLanguage, downloadInvoicePDF } from '../utils/pdfGenerator';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  supplier: SupplierProfile;
  language: DocLanguage;
  onLanguageChange: (lang: DocLanguage) => void;
  isProfitUnlocked: boolean;
  onRequestUnlockProfit: () => void;
  onRequestPrintPassword: (action: () => void) => void;
  onClose: () => void;
  onMarkPaid: (invoiceId: string) => void;
  onOpenDPModal?: (invoice: Invoice) => void;
  onCancelInvoice: (invoiceId: string) => void;
  onOpenWhatsAppAI: (invoice: Invoice) => void;
  onUpdateInvoice: (updatedInvoice: Invoice) => void;
}

function formatFullDate(dateStr: string, lang: DocLanguage = 'id'): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const monthsId = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const monthsEn = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${day} ${lang === 'en' ? monthsEn[month - 1] : monthsId[month - 1]} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatRpCompact(amount: number): string {
  const isNeg = amount < 0;
  const formatted = new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(amount)));
  return isNeg ? `-Rp${formatted}` : `Rp${formatted}`;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  supplier,
  language,
  onLanguageChange,
  isProfitUnlocked,
  onRequestUnlockProfit,
  onRequestPrintPassword,
  onClose,
  onMarkPaid,
  onOpenDPModal,
  onCancelInvoice,
  onOpenWhatsAppAI,
  onUpdateInvoice,
}) => {
  const isEn = language === 'en';
  const [docMode, setDocMode] = useState<'INVOICE' | 'SURAT_JALAN'>('INVOICE');
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Editable local draft state
  const [draftInvNumber, setDraftInvNumber] = useState('');
  const [draftIssueDate, setDraftIssueDate] = useState('');
  const [draftStatus, setDraftStatus] = useState<InvoiceStatus>('UNPAID');
  const [draftPaidAmount, setDraftPaidAmount] = useState<number>(0);
  const [draftVillaName, setDraftVillaName] = useState('');
  const [draftVillaAddress, setDraftVillaAddress] = useState('');
  const [draftVillaContact, setDraftVillaContact] = useState('');
  const [draftItems, setDraftItems] = useState<InvoiceLineItem[]>([]);
  const [draftTaxRate, setDraftTaxRate] = useState<number>(0);
  const [draftDiscount, setDraftDiscount] = useState<number>(0);

  useEffect(() => {
    if (invoice) {
      setDraftInvNumber(invoice.invoiceNumber);
      setDraftIssueDate(invoice.issueDate);
      setDraftStatus(invoice.status);
      setDraftPaidAmount(invoice.paidAmount || 0);
      setDraftVillaName(invoice.villaName);
      setDraftVillaAddress(invoice.villaAddress);
      setDraftVillaContact(invoice.villaContact);
      setDraftItems(invoice.items.map((it) => ({ ...it })));
      setDraftTaxRate(invoice.taxRate || 0);
      setDraftDiscount(invoice.discountAmount || 0);
      setIsEditingInline(false);
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleItemChange = (
    idx: number,
    field: 'name' | 'quantity' | 'unit' | 'unitPrice' | 'costPriceAtSale',
    value: string | number
  ) => {
    setDraftItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        const qty = Math.max(1, Number(updated.quantity) || 1);
        const price = Math.max(0, Number(updated.unitPrice) || 0);
        const cost = Math.max(0, Number(updated.costPriceAtSale) || 0);
        updated.quantity = qty;
        updated.unitPrice = price;
        updated.costPriceAtSale = cost;
        updated.subtotal = qty * price;
        updated.totalCost = qty * cost;
        updated.itemProfit = updated.subtotal - updated.totalCost;
        return updated;
      })
    );
  };

  const handleAddCustomRow = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        productId: `manual-${Date.now()}`,
        sku: 'MANUAL',
        name: 'Item Tambahan Manual',
        unit: 'Pcs',
        quantity: 1,
        costPriceAtSale: 50000,
        unitPrice: 80000,
        subtotal: 80000,
        totalCost: 50000,
        itemProfit: 30000,
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (draftItems.length <= 1) return;
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const computedSubtotal = draftItems.reduce((s, it) => s + it.subtotal, 0);
  const computedTotalCost = draftItems.reduce((s, it) => s + it.totalCost, 0);
  const taxableBase = Math.max(0, computedSubtotal - draftDiscount);
  const computedTaxAmount = Math.round((taxableBase * draftTaxRate) / 100);
  const computedTotalAmount = taxableBase + computedTaxAmount + (invoice.shippingCost || 0);
  const computedNetProfit =
    taxableBase + (invoice.shippingCost || 0) - computedTotalCost - (invoice.operationalCost || 0);
  const computedMarginPct =
    taxableBase > 0 ? (computedNetProfit / taxableBase) * 100 : 0;

  const effectivePaidAmount =
    draftStatus === 'PAID'
      ? computedTotalAmount
      : draftStatus === 'PARTIAL'
      ? Math.min(computedTotalAmount, Math.max(0, draftPaidAmount))
      : 0;

  const effectiveRemainingAmount = Math.max(0, computedTotalAmount - effectivePaidAmount);

  const buildUpdatedInvoiceObject = (): Invoice => {
    const finalStatus: InvoiceStatus =
      draftStatus === 'PARTIAL' && effectivePaidAmount >= computedTotalAmount && computedTotalAmount > 0
        ? 'PAID'
        : draftStatus === 'PARTIAL' && effectivePaidAmount <= 0
        ? 'UNPAID'
        : draftStatus;

    return {
      ...invoice,
      invoiceNumber: draftInvNumber.trim() || invoice.invoiceNumber,
      issueDate: draftIssueDate || invoice.issueDate,
      status: finalStatus,
      villaName: draftVillaName.trim() || invoice.villaName,
      villaAddress: draftVillaAddress.trim(),
      villaContact: draftVillaContact.trim(),
      items: draftItems,
      subtotal: computedSubtotal,
      discountAmount: draftDiscount,
      taxRate: draftTaxRate,
      taxAmount: computedTaxAmount,
      totalAmount: computedTotalAmount,
      paidAmount: finalStatus === 'PAID' ? computedTotalAmount : effectivePaidAmount,
      totalCostOfGoods: computedTotalCost,
      netProfit: computedNetProfit,
      profitMarginPct: computedMarginPct,
    };
  };

  const handleSaveManualEdits = () => {
    const updated = buildUpdatedInvoiceObject();
    onUpdateInvoice(updated);
    setIsEditingInline(false);
    return updated;
  };

  const statusText = isEn
    ? draftStatus === 'PAID'
      ? 'Paid'
      : draftStatus === 'PARTIAL'
      ? 'Partially Paid'
      : draftStatus === 'CANCELLED'
      ? 'Cancelled'
      : 'Unpaid'
    : draftStatus === 'PAID'
    ? 'Sudah Dibayar (Lunas)'
    : draftStatus === 'PARTIAL'
    ? 'Dibayar Sebagian (DP)'
    : draftStatus === 'CANCELLED'
    ? 'Dibatalkan'
    : 'Belum Dibayar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="bg-slate-100 border border-slate-300 rounded-xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Action Bar (Not Printed) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setDocMode('INVOICE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  docMode === 'INVOICE' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Format Invoice
              </button>
              <button
                type="button"
                onClick={() => setDocMode('SURAT_JALAN')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  docMode === 'SURAT_JALAN' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Surat Jalan
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEditingInline ? (
              <button
                type="button"
                onClick={() => setIsEditingInline(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Manual Invoice
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveManualEdits}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4" />
                Simpan Editan Manual
              </button>
            )}

            {draftStatus !== 'PAID' && draftStatus !== 'CANCELLED' && !isEditingInline && (
              <>
                {onOpenDPModal && (
                  <button
                    type="button"
                    onClick={() => onOpenDPModal(buildUpdatedInvoiceObject())}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Bayar DP</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onMarkPaid(invoice.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tandai Lunas
                </button>
              </>
            )}

            {invoice.status !== 'CANCELLED' && !confirmCancel && !isEditingInline && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-red-900/80 text-slate-300 hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Batalkan
              </button>
            )}

            {confirmCancel && (
              <div className="flex items-center gap-1.5 bg-red-950 px-2.5 py-1 rounded-lg border border-red-700">
                <span className="text-xs text-red-200">Yakin batalkan?</span>
                <button
                  type="button"
                  onClick={() => {
                    onCancelInvoice(invoice.id);
                    setConfirmCancel(false);
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded hover:bg-red-500 whitespace-nowrap shrink-0"
                >
                  Ya
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="px-2 py-1 text-xs text-slate-300 hover:text-white whitespace-nowrap shrink-0"
                >
                  Tidak
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const targetInv = isEditingInline ? handleSaveManualEdits() : buildUpdatedInvoiceObject();
                onOpenWhatsAppAI(targetInv);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Kirim WA (AI)
            </button>

            <button
              type="button"
              onClick={() => {
                const targetInv = isEditingInline ? handleSaveManualEdits() : buildUpdatedInvoiceObject();
                onRequestPrintPassword(() => {
                  downloadInvoicePDF(targetInv, supplier, docMode, language);
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white text-slate-950 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-teal-700" />
              Simpan File PDF ke Perangkat
            </button>

            <button
              type="button"
              onClick={() => {
                if (isEditingInline) handleSaveManualEdits();
                onRequestPrintPassword(() => {
                  setTimeout(() => window.print(), 100);
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Cetak langsung ke mesin printer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isEditingInline && (
          <div className="no-print px-6 py-2 bg-amber-50 text-amber-900 border-b border-amber-200 text-xs font-medium">
            Mode Edit Manual Aktif — Silakan ubah teks, tanggal, status, atau barang langsung pada lembaran invoice di bawah ini.
          </div>
        )}

        {/* Printable Document Canvas — Matching Reference Image Layout WITHOUT Due Date */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            id="printable-invoice-area"
            className="bg-white border border-slate-200 shadow-sm px-10 py-12 max-w-[780px] mx-auto text-slate-950"
          >
            {/* 1. Centered Header Block */}
            <div className="text-center space-y-1 mb-10">
              <h1 className="text-lg font-bold tracking-wide text-slate-950 uppercase mb-3">
                {docMode === 'INVOICE'
                  ? 'INVOICE'
                  : isEn
                  ? 'DELIVERY NOTE'
                  : 'SURAT JALAN'}
              </h1>
              <div className="text-sm font-medium text-slate-900">{supplier.companyName}</div>
              <div className="text-sm text-slate-800">{supplier.address}</div>
              <div className="text-sm text-slate-800">
                {[supplier.email, supplier.phone].filter((v) => v && v !== '-').join(' · ')}
              </div>
              {supplier.socialMedia && supplier.socialMedia !== '-' && (
                <div className="text-sm text-slate-800">{supplier.socialMedia}</div>
              )}
            </div>

            {/* 2. Two-Column Invoice Info & Ditagihkan Kepada (Tanpa Jatuh Tempo) */}
            <div className="grid grid-cols-2 gap-8 text-sm mb-10 items-start">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <div className="font-bold text-slate-950">
                    {docMode === 'INVOICE'
                      ? 'Invoice'
                      : isEn
                      ? 'Delivery Note No.'
                      : 'Nomor Surat Jalan'}
                  </div>
                  {isEditingInline ? (
                    <input
                      type="text"
                      value={draftInvNumber}
                      onChange={(e) => setDraftInvNumber(e.target.value)}
                      className="mt-1 px-2.5 py-1 text-sm border border-teal-600 rounded bg-amber-50/40 w-60"
                    />
                  ) : (
                    <div className="text-slate-900 mt-0.5">
                      {docMode === 'INVOICE'
                        ? draftInvNumber
                        : draftInvNumber.replace('INV/', isEn ? 'DN/' : 'SJ/')}
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-bold text-slate-950">
                    {isEn ? 'Issue Date' : 'Tanggal Terbit'}
                  </div>
                  {isEditingInline ? (
                    <input
                      type="date"
                      value={draftIssueDate}
                      onChange={(e) => setDraftIssueDate(e.target.value)}
                      className="mt-1 px-2.5 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                    />
                  ) : (
                    <div className="text-slate-900 mt-0.5">
                      {formatFullDate(draftIssueDate, language)}
                    </div>
                  )}
                </div>

                {docMode === 'INVOICE' && (
                  <div>
                    <div className="font-bold text-slate-950">Status</div>
                    {isEditingInline ? (
                      <select
                        value={draftStatus}
                        onChange={(e) => {
                          const next = e.target.value as InvoiceStatus;
                          setDraftStatus(next);
                          if (next === 'PARTIAL' && draftPaidAmount <= 0 && computedTotalAmount > 0) {
                            setDraftPaidAmount(Math.round(computedTotalAmount * 0.5));
                          }
                        }}
                        className="mt-1 px-2.5 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                      >
                        <option value="UNPAID">{isEn ? 'Unpaid' : 'Belum Dibayar'}</option>
                        <option value="PARTIAL">
                          {isEn ? 'Partially Paid (DP)' : 'Dibayar Sebagian (DP)'}
                        </option>
                        <option value="PAID">{isEn ? 'Paid' : 'Sudah Dibayar (Lunas)'}</option>
                      </select>
                    ) : (
                      <div className="text-slate-900 mt-0.5">{statusText}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Ditagihkan Kepada / Billed To */}
              <div className="space-y-4">
                <div>
                  <div className="font-bold text-slate-950">
                    {docMode === 'INVOICE'
                      ? isEn
                        ? 'Billed To'
                        : 'Ditagihkan Kepada'
                      : isEn
                      ? 'Delivered To'
                      : 'Dikirimkan Kepada'}
                  </div>
                  {isEditingInline ? (
                    <div className="space-y-2 mt-1">
                      <input
                        type="text"
                        value={draftVillaName}
                        onChange={(e) => setDraftVillaName(e.target.value)}
                        placeholder="Nama Villa / Perusahaan"
                        className="w-full px-2.5 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                      />
                      <textarea
                        rows={2}
                        value={draftVillaAddress}
                        onChange={(e) => setDraftVillaAddress(e.target.value)}
                        placeholder="Alamat Lengkap Villa"
                        className="w-full px-2.5 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                      />
                      <input
                        type="text"
                        value={draftVillaContact}
                        onChange={(e) => setDraftVillaContact(e.target.value)}
                        placeholder="Nama PIC / Penerima (Opsional)"
                        className="w-full px-2.5 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="text-slate-900 mt-0.5">{draftVillaName}</div>
                      <div className="text-slate-800">{draftVillaAddress}</div>
                      {draftVillaContact && draftVillaContact !== '-' && (
                        <div className="text-slate-800">
                          {isEn ? 'Attn:' : 'UP:'} {draftVillaContact}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Blue Header Grid Table */}
            <div className="mb-8">
              <table className="w-full border-collapse border border-slate-800 text-sm">
                <thead>
                  <tr className="bg-[#1976D2] text-white font-bold">
                    <th className="border border-slate-800 bg-[#1976D2] text-white py-2.5 px-3 text-center">
                      {isEn ? 'Description' : 'Deskripsi'}
                    </th>
                    <th className="border border-slate-800 bg-[#1976D2] text-white py-2.5 px-3 text-center w-20">
                      Qty
                    </th>
                    <th className="border border-slate-800 bg-[#1976D2] text-white py-2.5 px-3 text-center w-28">
                      {isEn ? 'Unit' : 'Satuan'}
                    </th>
                    {docMode === 'INVOICE' ? (
                      <>
                        <th className="border border-slate-800 bg-[#1976D2] text-white py-2.5 px-3 text-center w-36">
                          {isEn ? 'Unit Price' : 'Harga Satuan'}
                        </th>
                        <th className="border border-slate-800 bg-[#1976D2] text-white py-2.5 px-3 text-center w-36">
                          Subtotal
                        </th>
                        {isEditingInline && (
                          <th className="no-print border border-slate-800 bg-[#1976D2] text-white py-2.5 px-2 text-center w-10"></th>
                        )}
                      </>
                    ) : (
                      <th className="border border-slate-800 bg-[#1976D2] text-white py-2.5 px-3 text-center w-36">
                        {isEn ? 'Remarks / Check' : 'Keterangan / Cek'}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map((item, idx) => (
                    <tr key={idx} className="text-slate-900">
                      <td className="border border-slate-800 py-2 px-3">
                        {isEditingInline ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="border border-slate-800 py-2 px-3 tabular-nums">
                        {isEditingInline ? (
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="border border-slate-800 py-2 px-3">
                        {isEditingInline ? (
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                          />
                        ) : (
                          item.unit
                        )}
                      </td>
                      {docMode === 'INVOICE' ? (
                        <>
                          <td className="border border-slate-800 py-2 px-3 tabular-nums">
                            {isEditingInline ? (
                              <input
                                type="number"
                                min={0}
                                step={500}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleItemChange(idx, 'unitPrice', Number(e.target.value))
                                }
                                className="w-28 px-2 py-1 text-sm border border-teal-600 rounded bg-amber-50/40"
                              />
                            ) : (
                              formatRpCompact(item.unitPrice)
                            )}
                          </td>
                          <td className="border border-slate-800 py-2 px-3 tabular-nums">
                            {formatRpCompact(item.subtotal)}
                          </td>
                          {isEditingInline && (
                            <td className="no-print border border-slate-800 py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                disabled={draftItems.length <= 1}
                                className="text-red-600 hover:text-red-800 disabled:opacity-30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </>
                      ) : (
                        <td className="border border-slate-800 py-2.5 px-3 text-center">
                          {isEn ? '[    ] Complete' : '[    ] Lengkap'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {isEditingInline && (
                <div className="no-print mt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleAddCustomRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Baris Manual
                  </button>
                </div>
              )}
            </div>

            {/* 4. Right-Aligned Summary Block */}
            {docMode === 'INVOICE' && (
              <div className="flex justify-end mb-10">
                <div className="w-full max-w-[300px] space-y-2.5 text-sm">
                  <div className="grid grid-cols-2 items-center">
                    <span className="text-slate-900">Subtotal</span>
                    <span className="text-slate-900 tabular-nums">
                      {formatRpCompact(computedSubtotal)}
                    </span>
                  </div>

                  {(draftDiscount > 0 || isEditingInline) && (
                    <div className="grid grid-cols-2 items-center">
                      <span className="text-slate-900">
                        {isEn ? 'Discount (Rp)' : 'Diskon (Rp)'}
                      </span>
                      {isEditingInline ? (
                        <input
                          type="number"
                          min={0}
                          step={5000}
                          value={draftDiscount}
                          onChange={(e) => setDraftDiscount(Math.max(0, Number(e.target.value)))}
                          className="w-28 px-2 py-0.5 text-sm border border-teal-600 rounded bg-amber-50/40"
                        />
                      ) : (
                        <span className="text-slate-900 tabular-nums">
                          -{formatRpCompact(draftDiscount)}
                        </span>
                      )}
                    </div>
                  )}

                  {(computedTaxAmount > 0 || isEditingInline) && (
                    <div className="grid grid-cols-2 items-center">
                      <span className="text-slate-900">
                        {isEditingInline
                          ? isEn
                            ? 'VAT (%)'
                            : 'PPN (%)'
                          : isEn
                          ? `VAT ${draftTaxRate}%`
                          : `PPN ${draftTaxRate}%`}
                      </span>
                      {isEditingInline ? (
                        <select
                          value={draftTaxRate}
                          onChange={(e) => setDraftTaxRate(Number(e.target.value))}
                          className="w-28 px-2 py-0.5 text-sm border border-teal-600 rounded bg-amber-50/40"
                        >
                          <option value={0}>0%</option>
                          <option value={11}>11% ({formatRpCompact(computedTaxAmount)})</option>
                        </select>
                      ) : (
                        <span className="text-slate-900 tabular-nums">
                          {formatRpCompact(computedTaxAmount)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 pt-1">
                    <span className="font-bold text-slate-950">
                      {isEn ? 'Total Amount' : 'Total Tagihan'}
                    </span>
                    <span className="font-bold text-slate-950 tabular-nums">
                      {formatRpCompact(computedTotalAmount)}
                    </span>
                  </div>

                  {(isEditingInline ||
                    (effectivePaidAmount > 0 && effectivePaidAmount < computedTotalAmount)) && (
                    <>
                      <div className="grid grid-cols-2 items-center pt-1">
                        <span className="text-slate-900">
                          {isEn ? 'Down Payment (DP)' : 'DP / Telah Dibayar'}
                        </span>
                        {isEditingInline ? (
                          <input
                            type="number"
                            min={0}
                            max={computedTotalAmount}
                            step={5000}
                            value={draftPaidAmount}
                            onChange={(e) => {
                              const val = Math.min(
                                computedTotalAmount,
                                Math.max(0, Number(e.target.value))
                              );
                              setDraftPaidAmount(val);
                              if (val > 0 && val < computedTotalAmount) {
                                setDraftStatus('PARTIAL');
                              } else if (val >= computedTotalAmount && computedTotalAmount > 0) {
                                setDraftStatus('PAID');
                              } else {
                                setDraftStatus('UNPAID');
                              }
                            }}
                            className="w-28 px-2 py-0.5 text-sm border border-teal-600 rounded bg-amber-50/40"
                          />
                        ) : (
                          <span className="text-slate-900 tabular-nums">
                            -{formatRpCompact(effectivePaidAmount)}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 pt-1 border-t border-slate-300">
                        <span className="font-bold text-slate-950">
                          {isEn ? 'Balance Due' : 'Sisa Tagihan'}
                        </span>
                        <span className="font-bold text-slate-950 tabular-nums">
                          {formatRpCompact(effectiveRemainingAmount)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 5. Bottom Bordered Informasi Pembayaran Box */}
            {docMode === 'INVOICE' ? (
              <div className="border border-slate-800 p-4 text-xs space-y-2 text-slate-900">
                <div className="text-sm font-bold text-slate-950">
                  {isEn ? 'Payment Information' : 'Informasi Pembayaran'}
                </div>
                <div className="space-y-0.5 leading-relaxed">
                  <div>
                    {isEn
                      ? `${supplier.bankName} · Account No. ${supplier.bankAccountNumber} · Account Name: ${supplier.bankAccountName}`
                      : `${supplier.bankName} · No Rekening ${supplier.bankAccountNumber} · a.n ${supplier.bankAccountName}`}
                  </div>
                  <div>
                    {isEn
                      ? `Kindly confirm your payment along with the transfer receipt via the WhatsApp number listed above (${supplier.phone}).`
                      : `Mohon melakukan konfirmasi pembayaran beserta bukti transfer melalui nomor WhatsApp yang tercantum (${supplier.phone}).`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-800 p-4 text-xs space-y-6 text-slate-900">
                <div>
                  <span className="font-bold text-slate-950">
                    {isEn ? 'Handover Note: ' : 'Catatan Serah Terima Barang: '}
                  </span>
                  {isEn
                    ? 'All items have been inspected and received in good condition.'
                    : 'Barang telah diperiksa dan diterima dalam jumlah serta kondisi baik.'}
                </div>
                <div className="grid grid-cols-2 gap-8 pt-6 text-center">
                  <div>
                    <div className="mb-12">
                      {isEn ? 'Received By (Villa),' : 'Penerima Pihak Villa,'}
                    </div>
                    <div className="font-medium">( {draftVillaContact || draftVillaName} )</div>
                  </div>
                  <div>
                    <div className="mb-12">
                      {isEn
                        ? `Delivered By (${supplier.companyName}),`
                        : `Pengirim (${supplier.companyName}),`}
                    </div>
                    <div className="font-medium">( {supplier.signeeName} )</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
