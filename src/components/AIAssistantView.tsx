import React, { useState } from 'react';
import {
  Bot,
  MessageSquareText,
  TrendingUp,
  Send,
  Check,
  Copy,
  RefreshCw,
  AlertTriangle,
  FilePlus2,
  PackagePlus,
} from 'lucide-react';
import { Invoice, InvoiceLineItem, ProductItem, SupplierProfile, VillaClient } from '../types';
import { formatPercent, formatRupiah } from '../utils/formatters';
import { AIWhatsAppInvoicePanel } from './AIWhatsAppSenderModal';

interface AIAssistantViewProps {
  products: ProductItem[];
  invoices: Invoice[];
  clients: VillaClient[];
  supplier: SupplierProfile;
  onCreateInvoiceFromAI: (invoice: Invoice, newClient?: VillaClient) => void;
  onTriggerRestockProduct: (product: ProductItem) => void;
  onOpenPrintPreview: (invoice: Invoice) => void;
}

interface ParsedOrderResult {
  matchedVillaId: string;
  detectedVillaName: string;
  detectedVillaArea: string;
  paymentTermsDays: number;
  notes: string;
  items: {
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface AIBusinessAnalysisResult {
  executiveSummary: string;
  profitInsights: {
    title: string;
    detail: string;
    impactEstimate: string;
  }[];
  restockRecommendations: {
    sku: string;
    productName: string;
    currentStock: number;
    recommendedOrderQty: number;
    estimatedCapitalNeeded: number;
    reason: string;
  }[];
  collectionDrafts: {
    villaName: string;
    invoiceNumber: string;
    unpaidAmount: number;
    whatsappMessage: string;
  }[];
}

const SAMPLE_WA_ORDERS = [
  {
    label: 'Contoh WA 1: Mandala Villa Canggu',
    text: 'Selamat pagi Bli, dari Purchasing Mandala Eco Luxury Villas Canggu. Untuk pengiriman besok pagi tolong disiapkan: Shower gel lemongrass 8 jerigen, Shampoo frangipani 6 jerigen, Dental kit bambu 4 box, sama Tissue roll 10 karton ya. Pembayaran tempo biasa 14 hari. Tolong antar sebelum jam 11 siang.',
  },
  {
    label: 'Contoh WA 2: Cliffside Uluwatu',
    text: 'Halo KaryaVilla, saya Pak Hendra dari The Cliffside Sanctuary Uluwatu. Kolam utama kami butuh Kaporit TCCA 2 pail sama penjernih air PAC 3 sak. Sekalian tambah handuk kolam renang 15 pcs dan pembersih lantai marmer 6 jerigen. Kirim ke gudang engineering Pecatu ya.',
  },
  {
    label: 'Contoh WA 3: Klien Villa Baru (Pererenan)',
    text: 'Siang pak, kami dari Villa Soma Pererenan (klien baru, PIC Ibu Ratna). Mau order perdana sprei Flat Sheet King TC300 12 pcs, Bath towel hotel 20 pcs, sandal kamar waffle 3 karung, dan kopi Arabica Kintamani 5 pack. Tolong dibuatkan invoicenya.',
  },
];

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  products,
  invoices,
  clients,
  supplier,
  onCreateInvoiceFromAI,
  onTriggerRestockProduct,
  onOpenPrintPreview,
}) => {
  // Section 1: Smart WhatsApp Order Parser State
  const [rawOrderText, setRawOrderText] = useState(SAMPLE_WA_ORDERS[0].text);
  const [isParsingOrder, setIsParsingOrder] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedOrder, setParsedOrder] = useState<ParsedOrderResult | null>(null);
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(false);

  // Section 2: AI Business & Profit Analysis State
  const [focusTopic, setFocusTopic] = useState('Analisis Menyeluruh Laba, Stok Gudang & Piutang Villa');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIBusinessAnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Section 3: AI Advisor Q&A State
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<{ q: string; a: string }[]>([]);
  const [askError, setAskError] = useState<string | null>(null);

  // Handler 1: Parse WhatsApp Text into Draft Invoice
  const handleParseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawOrderText.trim()) return;

    setIsParsingOrder(true);
    setParseError(null);
    setParsedOrder(null);
    setOrderCreatedSuccess(false);

    try {
      const response = await fetch('/api/ai/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawOrderText,
          products,
          clients,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memproses teks pesanan.');
      }
      setParsedOrder(data);
    } catch (err: any) {
      setParseError(err?.message || 'Terjadi kesalahan saat mengekstrak pesanan.');
    } finally {
      setIsParsingOrder(false);
    }
  };

  // Convert Parsed Order directly into a real Invoice & deduct stock
  const handleConfirmCreateInvoiceFromParsed = () => {
    if (!parsedOrder || !parsedOrder.items || parsedOrder.items.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + (parsedOrder.paymentTermsDays || 14));
    const dueDateStr = due.toISOString().split('T')[0];

    let targetVilla = clients.find((c) => c.id === parsedOrder.matchedVillaId);
    let newClient: VillaClient | undefined;

    if (!targetVilla) {
      newClient = {
        id: `villa-${Date.now()}`,
        name: parsedOrder.detectedVillaName || 'Mitra Villa Baru',
        area: parsedOrder.detectedVillaArea || 'Bali',
        contactPerson: 'Purchasing Villa',
        phone: '-',
        email: '-',
        address: parsedOrder.detectedVillaArea || 'Bali',
        paymentTermsDays: parsedOrder.paymentTermsDays || 14,
      };
      targetVilla = newClient;
    }

    const invoiceItems: InvoiceLineItem[] = parsedOrder.items
      .map((item) => {
        const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
        if (!prod) return null;
        const qty = Math.max(1, Number(item.quantity) || 1);
        const sellPrice = Number(item.unitPrice) || prod.sellPrice;
        const subtotal = qty * sellPrice;
        const totalCost = qty * prod.costPrice;
        return {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          unit: prod.unit,
          quantity: qty,
          costPriceAtSale: prod.costPrice,
          unitPrice: sellPrice,
          subtotal,
          totalCost,
          itemProfit: subtotal - totalCost,
        };
      })
      .filter((x): x is InvoiceLineItem => x !== null);

    if (invoiceItems.length === 0) return;

    const subtotal = invoiceItems.reduce((s, i) => s + i.subtotal, 0);
    const totalCostOfGoods = invoiceItems.reduce((s, i) => s + i.totalCost, 0);
    const operationalCost = 35000;
    const netProfit = subtotal - totalCostOfGoods - operationalCost;
    const profitMarginPct = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;

    const num = String(invoices.length + 1).padStart(3, '0');
    const yearMonth = todayStr.slice(0, 7).replace('-', '/');

    const createdInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV/KVS/${yearMonth}/${num}`,
      villaId: targetVilla.id,
      villaName: targetVilla.name,
      villaArea: targetVilla.area,
      villaAddress: targetVilla.address,
      villaContact: targetVilla.contactPerson,
      issueDate: todayStr,
      dueDate: dueDateStr,
      status: 'UNPAID',
      items: invoiceItems,
      subtotal,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      shippingCost: 0,
      operationalCost,
      totalAmount: subtotal,
      paidAmount: 0,
      totalCostOfGoods,
      netProfit,
      profitMarginPct,
      notes: parsedOrder.notes || 'Diekstrak otomatis via AI Smart Order dari pesan pesanan villa.',
    };

    onCreateInvoiceFromAI(createdInvoice, newClient);
    setOrderCreatedSuccess(true);
    setParsedOrder(null);
  };

  // Handler 2: Run Full Business & Profit Intelligence
  const handleRunBusinessAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/ai/business-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          invoices: invoices.filter((i) => i.status !== 'CANCELLED'),
          clients,
          focusTopic,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menjalankan analisis AI.');
      }
      setAnalysisResult(data);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Gagal menghubungi server AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handler 3: Ask AI Business Question
  const handleAskQuestion = async (customQuestion?: string) => {
    const qText = (customQuestion ?? question).trim();
    if (!qText) return;

    setIsAsking(true);
    setAskError(null);
    if (!customQuestion) setQuestion('');

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qText,
          contextData: {
            totalProducts: products.length,
            products: products.map((p) => ({
              sku: p.sku,
              name: p.name,
              stock: p.stock,
              minStock: p.minStock,
              unit: p.unit,
              costPriceHPP: p.costPrice,
              sellPrice: p.sellPrice,
            })),
            invoices: invoices
              .filter((i) => i.status !== 'CANCELLED')
              .map((inv) => ({
                invoiceNumber: inv.invoiceNumber,
                villaName: inv.villaName,
                status: inv.status,
                totalAmount: inv.totalAmount,
                paidAmount: inv.paidAmount,
                totalHPP: inv.totalCostOfGoods,
                netProfit: inv.netProfit,
                marginPct: inv.profitMarginPct,
              })),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendapatkan jawaban AI.');
      }
      setQaHistory((prev) => [{ q: qText, a: data.answer }, ...prev]);
    } catch (err: any) {
      setAskError(err?.message || 'Gagal memproses pertanyaan.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          FITUR AI UTAMA: GENERATOR PESAN WHATSAPP PENGIRIMAN FILE INVOICE
      ===================================================================== */}
      <AIWhatsAppInvoicePanel
        invoices={invoices}
        clients={clients}
        supplier={supplier}
        onOpenPrintPreview={onOpenPrintPreview}
      />

      {/* =====================================================================
          FITUR AI 1: EKSTRAKSI CHAT WHATSAPP PURCHASING VILLA -> DRAFT INVOICE
      ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-teal-700" />
              <span>AI Pembuat Invoice Otomatis dari Chat WhatsApp Villa</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tempel pesan chat WhatsApp dari bagian Purchasing/Housekeeping Villa. AI akan otomatis mencocokkan SKU stok gudang, menghitung modal HPP, dan menyiapkan Invoice beserta estimasi keuntungan Anda.
            </p>
          </div>
        </div>

        {/* Quick Sample Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Coba Contoh Chat WA:</span>
          {SAMPLE_WA_ORDERS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setRawOrderText(sample.text);
                setParsedOrder(null);
                setOrderCreatedSuccess(false);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleParseOrder} className="space-y-3">
          <textarea
            rows={3}
            value={rawOrderText}
            onChange={(e) => setRawOrderText(e.target.value)}
            placeholder="Tempel chat WhatsApp pesanan dari PIC Villa di sini..."
            className="w-full p-3.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              AI mencocokkan teks dengan {products.length} SKU di gudang dan {clients.length} mitra villa terdaftar.
            </span>
            <button
              type="submit"
              disabled={isParsingOrder || !rawOrderText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isParsingOrder ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengekstrak Pesanan dengan AI...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  <span>Ekstrak Pesanan ke Draft Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>

        {parseError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {orderCreatedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
            <span>
              Invoice berhasil diterbitkan, stok gudang otomatis dipotong, dan jendela cetak invoice telah dibuka.
            </span>
          </div>
        )}

        {/* Parsed Draft Preview */}
        {parsedOrder && (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-semibold text-teal-800">
                  Hasil Ekstraksi AI — Siap Diterbitkan Menjadi Invoice
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  Klien Villa: {parsedOrder.detectedVillaName}{' '}
                  <span className="font-normal text-slate-600">
                    ({parsedOrder.detectedVillaArea || 'Bali'} · Tempo {parsedOrder.paymentTermsDays || 14} Hari)
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-600">
                Status Klien:{' '}
                <span className="font-semibold text-slate-900">
                  {parsedOrder.matchedVillaId !== 'NEW'
                    ? 'Mitra Villa Terdaftar'
                    : 'Mitra Villa Baru (Otomatis Didaftarkan)'}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 bg-white rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Nama Barang Gudang</th>
                    <th className="py-2.5 px-3 text-right">Stok Saat Ini</th>
                    <th className="py-2.5 px-3 text-right">Qty Dipesan</th>
                    <th className="py-2.5 px-3 text-right">Modal HPP</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 text-right">Estimasi Laba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-mono tabular-nums">
                  {parsedOrder.items.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
                    const cost = prod?.costPrice || 0;
                    const price = item.unitPrice || prod?.sellPrice || 0;
                    const sub = item.quantity * price;
                    const profit = sub - item.quantity * cost;
                    const stockOk = prod ? prod.stock >= item.quantity : false;
                    return (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 text-slate-600">{prod?.sku || item.sku}</td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                          {prod?.name || item.productName}
                        </td>
                        <td className={`py-2.5 px-3 text-right ${stockOk ? 'text-slate-600' : 'text-red-600 font-bold'}`}>
                          {prod ? `${prod.stock} ${prod.unit}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {item.quantity} {prod?.unit || ''}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">{formatRupiah(cost)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-800">{formatRupiah(price)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{formatRupiah(sub)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">+{formatRupiah(profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(() => {
              const totalSub = parsedOrder.items.reduce((s, item) => {
                const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
                return s + item.quantity * (item.unitPrice || prod?.sellPrice || 0);
              }, 0);
              const totalHpp = parsedOrder.items.reduce((s, item) => {
                const prod = products.find((p) => p.id === item.productId || p.sku === item.sku);
                return s + item.quantity * (prod?.costPrice || 0);
              }, 0);
              const estNetProfit = totalSub - totalHpp - 35000;
              const estMargin = totalSub > 0 ? (estNetProfit / totalSub) * 100 : 0;

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                    <span>
                      Total Tagihan: <strong className="text-slate-900">{formatRupiah(totalSub)}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Total HPP: <strong className="text-slate-700">{formatRupiah(totalHpp)}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-800 font-bold">
                      Estimasi Laba Bersih: +{formatRupiah(estNetProfit)} ({formatPercent(estMargin)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmCreateInvoiceFromParsed}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    <span>Terbitkan Invoice & Potong Stok Sekarang</span>
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* =====================================================================
          FITUR AI 2: ANALISIS KEUNTUNGAN, REKOMENDASI RESTOK & PENAGIHAN WA
      ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-700" />
              <span>AI Audit Keuntungan, Perencanaan Restok & Draft Penagihan Piutang</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis otomatis terhadap margin HPP, rekomendasi belanja stok yang menipis, serta pembuatan pesan penagihan invoice ke manajemen villa.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="Analisis Menyeluruh Laba, Stok Gudang & Piutang Villa">
                Fokus: Analisis Menyeluruh
              </option>
              <option value="Optimasi Margin Harga Jual vs HPP untuk Meningkatkan Laba">
                Fokus: Optimasi Margin & Harga
              </option>
              <option value="Perencanaan Belanja Restok Gudang & Efisiensi Modal">
                Fokus: Prioritas Restok & Modal
              </option>
            </select>

            <button
              type="button"
              onClick={handleRunBusinessAnalysis}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menganalisis Data Bisnis...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 text-teal-400" />
                  <span>Jalankan Audit AI Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>

        {analysisError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {analysisError}
          </div>
        )}

        {!analysisResult && !isAnalyzing && (
          <div className="py-8 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-sm font-semibold text-slate-800">
              Belum ada hasil audit AI yang dijalankan pada sesi ini
            </div>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Klik tombol &ldquo;Jalankan Audit AI Sekarang&rdquo; di atas untuk mengolah data stok gudang, HPP, dan daftar invoice menjadi rekomendasi peningkatan keuntungan.
            </p>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="p-4 bg-emerald-950 text-emerald-50 rounded-xl space-y-1">
              <div className="text-xs font-semibold text-emerald-300">Ringkasan Eksekutif Konsultan AI</div>
              <p className="text-sm leading-relaxed">{analysisResult.executiveSummary}</p>
            </div>

            {/* 3 Profit Insights */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800">
                Strategi Peningkatan Keuntungan & Optimasi HPP
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(analysisResult.profitInsights || []).map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-900">
                        0{idx + 1}. {insight.title}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{insight.detail}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200 text-xs font-mono tabular-nums font-semibold text-teal-800">
                      Potensi Dampak: {insight.impactEstimate}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Restock Plan */}
            {analysisResult.restockRecommendations && analysisResult.restockRecommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800">
                  Rekomendasi Belanja Restok Gudang & Estimasi Kebutuhan Modal
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-3">SKU & Barang</th>
                        <th className="py-2.5 px-3 text-right">Stok Saat Ini</th>
                        <th className="py-2.5 px-3 text-right">Saran Order</th>
                        <th className="py-2.5 px-3 text-right">Estimasi Modal HPP</th>
                        <th className="py-2.5 px-3">Alasan AI</th>
                        <th className="py-2.5 px-3 text-right">Tindak Lanjut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {analysisResult.restockRecommendations.map((rec, idx) => {
                        const matchedProd = products.find((p) => p.sku === rec.sku);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-slate-500">[{rec.sku}]</span>{' '}
                              <span className="font-semibold text-slate-900">{rec.productName}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-600 font-bold">
                              {rec.currentStock}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-teal-800">
                              +{rec.recommendedOrderQty}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {formatRupiah(rec.estimatedCapitalNeeded)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{rec.reason}</td>
                            <td className="py-2.5 px-3 text-right">
                              {matchedProd && (
                                <button
                                  type="button"
                                  onClick={() => onTriggerRestockProduct(matchedProd)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md whitespace-nowrap shrink-0"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" />
                                  <span>Restok</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* WhatsApp Payment Collection Drafts */}
            {analysisResult.collectionDrafts && analysisResult.collectionDrafts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800">
                  Draft Pesan WhatsApp Penagihan Piutang Villa (Siap Salin)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.collectionDrafts.map((draft, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{draft.villaName}</span>
                          <span className="font-mono tabular-nums font-semibold text-red-600">
                            Tagihan: {formatRupiah(draft.unpaidAmount)}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-500">Ref: {draft.invoiceNumber}</div>
                        <p className="text-xs text-slate-700 bg-white p-3 border border-slate-200 rounded-md whitespace-pre-line">
                          {draft.whatsappMessage}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(draft.whatsappMessage);
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tersalin ke Clipboard</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Pesan WhatsApp</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          FITUR AI 3: TANYA JAWAB KONSULTAN AI BISNIS SUPPLIER VILLA
      ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Tanya Konsultan AI KaryaVilla (Berbasis Data Stok & Laba Anda)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tanyakan simulasi harga paket pembukaan villa baru, perhitungan margin HPP, atau analisis arus kas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            'Buatkan surat penawaran paket suplai awal untuk klien villa baru 6 kamar di Canggu',
            'Barang mana yang memberikan margin keuntungan tertinggi dan mana yang paling tipis?',
            'Berapa total uang saya yang masih tertahan di piutang villa dan bagaimana cara menagihnya?',
          ].map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAskQuestion(preset)}
              disabled={isAsking}
              className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-left"
            >
              &ldquo;{preset}&rdquo;
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ketik pertanyaan bisnis atau instruksi pembuatan penawaran harga..."
            className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{isAsking ? 'Memproses...' : 'Kirim Pertanyaan'}</span>
          </button>
        </form>

        {askError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {askError}
          </div>
        )}

        {qaHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            {qaHistory.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-xs font-bold text-slate-900">Pertanyaan: {item.q}</div>
                <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed border-t border-slate-200 pt-2">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
