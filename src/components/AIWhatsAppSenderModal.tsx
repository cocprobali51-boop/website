import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bot,
  Send,
  Copy,
  Check,
  Printer,
  Download,
  RefreshCw,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Invoice, SupplierProfile, VillaClient } from '../types';
import { formatDateId, formatRupiah } from '../utils/formatters';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

export type GreetingTime = 'Selamat Pagi' | 'Selamat Siang' | 'Selamat Sore' | 'Selamat Malam';
export type MessageLanguage = 'id' | 'en';

export function detectAutoGreeting(): GreetingTime {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

export function translateGreetingToEnglish(greeting: GreetingTime): string {
  if (greeting === 'Selamat Pagi') return 'Good morning';
  if (greeting === 'Selamat Siang') return 'Good afternoon';
  if (greeting === 'Selamat Sore') return 'Good afternoon';
  return 'Good evening';
}

export function formatPhoneForWhatsApp(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('62')) {
    return digits;
  }
  return '62' + digits;
}

export function buildInstantWhatsAppDraft(
  invoice: Invoice,
  supplier: SupplierProfile,
  greeting: GreetingTime,
  purpose: string,
  language: MessageLanguage = 'id'
): string {
  const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const itemsList = invoice.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.name} (${item.quantity} ${item.unit} x ${formatRupiah(item.unitPrice)}) = *${formatRupiah(item.subtotal)}*`
    )
    .join('\n');

  if (language === 'en') {
    const enGreet = translateGreetingToEnglish(greeting);
    const enFooter = `Best regards,
*${supplier.signeeName}*
*${supplier.companyName}*
Address: ${supplier.address}
WhatsApp/Phone: ${supplier.phone}${supplier.socialMedia ? `\nSocial Media: ${supplier.socialMedia}` : ''}`;

    if (purpose.includes('Pelunasan')) {
      return `${enGreet} ${invoice.villaContact},
*${invoice.villaName}* (${invoice.villaArea})

I hope everything is going smoothly at the villa today.

Please find attached the official *Paid Invoice (${invoice.invoiceNumber})* as confirmation that your payment of *${formatRupiah(invoice.totalAmount)}* has been received in full.

*Supplied Items Summary:*
${itemsList}

Thank you very much for your trust and continued partnership with *${supplier.companyName}*. Please let us know anytime you need additional villa supplies.

${enFooter}`;
    }

    if (purpose.includes('Pengingat')) {
      return `${enGreet} ${invoice.villaContact},
Management & Finance Team of *${invoice.villaName}* (${invoice.villaArea})

I hope you are having a great day. We would like to kindly follow up on the attached *Invoice No. ${invoice.invoiceNumber}* issued on ${formatDateId(invoice.issueDate)}.

*Villa Supply Invoice Summary:*
${itemsList}

Total Invoice Amount: *${formatRupiah(invoice.totalAmount)}*
Paid Amount: ${formatRupiah(invoice.paidAmount)}
*Remaining Balance Due: ${formatRupiah(remaining)}*

Payment can be transferred to our official bank account:
Bank: *${supplier.bankName}*
Account Number: *${supplier.bankAccountNumber}*
Account Holder: *${supplier.bankAccountName}*

We have also re-attached the official PDF Invoice in this chat. Kindly send us the transfer receipt via this WhatsApp number once the payment has been completed. Thank you very much for your cooperation.

${enFooter}`;
    }

    // Default English: New Invoice Delivery
    return `${enGreet} ${invoice.villaContact},
Management & Purchasing Team of *${invoice.villaName}* (${invoice.villaArea})

I hope operations at *${invoice.villaName}* are going great today.

Please find attached the official *Invoice (${invoice.invoiceNumber})* for your villa supply delivery, with the following details:

*Supplied Items:*
${itemsList}
${invoice.discountAmount > 0 ? `\nDiscount: -${formatRupiah(invoice.discountAmount)}` : ''}${invoice.shippingCost > 0 ? `\nDelivery Fee: ${formatRupiah(invoice.shippingCost)}` : ''}
*Total Invoice Amount: ${formatRupiah(invoice.totalAmount)}*${invoice.paidAmount > 0 ? `\nDown Payment / Paid: ${formatRupiah(invoice.paidAmount)}\n*Remaining Balance: ${formatRupiah(remaining)}*` : ''}

Payment can be made via bank transfer to:
Bank: *${supplier.bankName}*
Account Number: *${supplier.bankAccountNumber}*
Account Holder: *${supplier.bankAccountName}*

Kindly confirm your payment along with the transfer receipt via our WhatsApp number (${supplier.phone}). Please feel free to reach out if you have any questions regarding the items or the invoice. Thank you very much for your business!

${enFooter}`;
  }

  const supplierFooter = `Salam hormat,
*${supplier.signeeName}*
*${supplier.companyName}*
Alamat: ${supplier.address}
Telp/WA: ${supplier.phone}${supplier.socialMedia ? `\nSosial Media: ${supplier.socialMedia}` : ''}`;

  if (purpose.includes('Pelunasan')) {
    return `${greeting} ${invoice.villaContact},
Yth. Manajemen *${invoice.villaName}* (${invoice.villaArea})

Semoga aktivitas operasional di villa berjalan lancar hari ini.

Bersama pesan ini kami lampirkan dokumen *Invoice Lunas (${invoice.invoiceNumber})* sebagai bukti sah bahwa pembayaran sejumlah *${formatRupiah(invoice.totalAmount)}* telah kami terima dengan baik.

*Rincian Barang Suplai:*
${itemsList}

Terima kasih banyak atas kepercayaan dan kerja sama yang baik bersama *${supplier.companyName}*. Apabila ada kebutuhan stok tambahan untuk operasional villa, silakan menghubungi kami kembali.

${supplierFooter}`;
  }

  if (purpose.includes('Pengingat')) {
    return `${greeting} ${invoice.villaContact},
Yth. Bagian Finance & Purchasing *${invoice.villaName}* (${invoice.villaArea})

Semoga sehat dan lancar selalu. Mohon izin mengingatkan kembali terkait lampiran file *Invoice Tagihan No. ${invoice.invoiceNumber}* tertanggal ${formatDateId(invoice.issueDate)}.

*Ringkasan Tagihan Suplai Villa:*
${itemsList}

Total Tagihan: *${formatRupiah(invoice.totalAmount)}*
Telah Dibayar: ${formatRupiah(invoice.paidAmount)}
*Sisa Tagihan Saat Ini: ${formatRupiah(remaining)}*

Pembayaran dapat ditransfer melalui rekening resmi kami:
Bank: *${supplier.bankName}*
No. Rekening: *${supplier.bankAccountNumber}*
Atas Nama: *${supplier.bankAccountName}*

File PDF Invoice juga kami lampirkan kembali pada pesan ini. Mohon konfirmasinya apabila pembayaran telah dijadwalkan. Terima kasih banyak atas kerja samanya.

${supplierFooter}`;
  }

  // Default: Pengiriman File Invoice Baru & Rincian Barang
  return `${greeting} ${invoice.villaContact},
Yth. Manajemen & Purchasing *${invoice.villaName}* (${invoice.villaArea})

Semoga operasional di *${invoice.villaName}* berjalan lancar hari ini.

Bersama pesan ini kami kirimkan lampiran file *Invoice Resmi (${invoice.invoiceNumber})* untuk pengiriman suplai kebutuhan villa dengan rincian sebagai berikut:

*Daftar Barang Suplai:*
${itemsList}
${invoice.discountAmount > 0 ? `\nPotongan Diskon: -${formatRupiah(invoice.discountAmount)}` : ''}${invoice.shippingCost > 0 ? `\nBiaya Pengiriman: ${formatRupiah(invoice.shippingCost)}` : ''}
*Total Tagihan Invoice: ${formatRupiah(invoice.totalAmount)}*${invoice.paidAmount > 0 ? `\nDP / Telah Dibayar: ${formatRupiah(invoice.paidAmount)}\n*Sisa Tagihan: ${formatRupiah(remaining)}*` : ''}

Untuk pembayaran dapat dilakukan melalui transfer ke rekening berikut:
Bank: *${supplier.bankName}*
No. Rekening: *${supplier.bankAccountNumber}*
Atas Nama: *${supplier.bankAccountName}*

File PDF Invoice telah kami sertakan pada lampiran chat ini. Apabila ada hal yang perlu dikonfirmasi mengenai barang maupun tagihan, silakan menghubungi kami. Terima kasih banyak atas kerja sama yang baik.

${supplierFooter}`;
}

interface AIWhatsAppInvoicePanelProps {
  invoices: Invoice[];
  clients: VillaClient[];
  supplier: SupplierProfile;
  language: MessageLanguage;
  onLanguageChange: (lang: MessageLanguage) => void;
  initialInvoiceId?: string;
  onOpenPrintPreview?: (invoice: Invoice) => void;
  onRequestPrintPassword?: (action: () => void) => void;
  onCloseModal?: () => void;
  isModal?: boolean;
}

export const AIWhatsAppInvoicePanel: React.FC<AIWhatsAppInvoicePanelProps> = ({
  invoices,
  clients,
  supplier,
  language,
  onLanguageChange,
  initialInvoiceId,
  onOpenPrintPreview,
  onRequestPrintPassword,
  onCloseModal,
  isModal = false,
}) => {
  const activeInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'CANCELLED'),
    [invoices]
  );

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialInvoiceId || activeInvoices[0]?.id || ''
  );
  const [greetingTime, setGreetingTime] = useState<GreetingTime>(detectAutoGreeting);
  const [currentClockStr, setCurrentClockStr] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
  const [messagePurpose, setMessagePurpose] = useState<string>(
    'Pengiriman File Invoice Baru & Rincian Barang'
  );
  const [toneStyle, setToneStyle] = useState<string>(
    'Profesional, Sopan & Ramah khas Hospitality Bali'
  );
  const [customNote, setCustomNote] = useState<string>('');
  const [whatsappText, setWhatsappText] = useState<string>('');
  const [aiChecklist, setAiChecklist] = useState<string[]>([
    'Unduh / Simpan PDF Invoice terlebih dahulu melalui tombol Unduh File PDF.',
    'Lampirkan file PDF Invoice tersebut di ruang chat WhatsApp PIC / Owner Villa.',
    'Tempel (Paste) teks pengantar di bawah ini sebagai pesan penyerta file.',
  ]);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const selectedInvoice = useMemo(
    () => invoices.find((i) => i.id === selectedInvoiceId) || activeInvoices[0] || null,
    [invoices, activeInvoices, selectedInvoiceId]
  );

  const matchedClient = useMemo(
    () => clients.find((c) => c.id === selectedInvoice?.villaId) || null,
    [clients, selectedInvoice]
  );

  const [recipientPhone, setRecipientPhone] = useState<string>('');

  // Automatically sync greeting with the device's real-time clock
  useEffect(() => {
    const syncClock = () => {
      setGreetingTime(detectAutoGreeting());
      setCurrentClockStr(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
    };
    syncClock();
    const timer = setInterval(syncClock, 15000);
    return () => clearInterval(timer);
  }, [selectedInvoiceId, language]);

  useEffect(() => {
    if (initialInvoiceId) {
      setSelectedInvoiceId(initialInvoiceId);
    }
  }, [initialInvoiceId]);

  useEffect(() => {
    if (matchedClient?.phone && matchedClient.phone !== '-') {
      setRecipientPhone(matchedClient.phone);
    } else {
      setRecipientPhone('0812-3940-112');
    }
  }, [matchedClient]);

  // Update draft immediately when invoice, greeting, purpose, or language changes
  useEffect(() => {
    if (!selectedInvoice) return;
    const draft = buildInstantWhatsAppDraft(
      selectedInvoice,
      supplier,
      greetingTime,
      messagePurpose,
      language
    );
    setWhatsappText(draft);
  }, [selectedInvoice, supplier, greetingTime, messagePurpose, language]);

  const handleGenerateWithAI = async () => {
    if (!selectedInvoice) return;
    setIsGeneratingAI(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/whatsapp-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: selectedInvoice,
          supplier,
          clientPhone: recipientPhone,
          greetingTime,
          messagePurpose,
          toneStyle,
          customNote,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyusun pesan WhatsApp dengan AI.');
      }
      if (data.whatsappMessage) {
        setWhatsappText(data.whatsappMessage);
      }
      if (Array.isArray(data.checklistBeforeSend) && data.checklistBeforeSend.length > 0) {
        setAiChecklist(data.checklistBeforeSend);
      }
    } catch (err: any) {
      setAiError(err?.message || 'Gagal menghubungi server AI.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCopyText = () => {
    if (!whatsappText) return;
    navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const waTargetPhone = formatPhoneForWhatsApp(recipientPhone);
  const waWebUrl = waTargetPhone
    ? `https://wa.me/${waTargetPhone}?text=${encodeURIComponent(whatsappText)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  if (!selectedInvoice) {
    return (
      <div className="p-6 bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
        Belum ada data invoice untuk dikirim. Buat invoice terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-base font-bold">
            <Bot className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>AI Pengirim WhatsApp File Invoice (Otomatis Sapaan Pagi/Siang/Sore)</span>
          </div>
          <p className="text-xs text-slate-300">
            Pilih invoice yang ingin Anda kirim, pilih bahasa pesan (Indonesia / English), dan AI akan menyiapkan kata pengantar lengkap beserta rincian tagihan & nomor rekening.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Language Toggle in AI Kirim WA Header */}
          <div className="flex items-center gap-1 p-1 bg-slate-800 border border-slate-700 rounded-lg">
            <button
              type="button"
              onClick={() => onLanguageChange('id')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                language === 'id'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Indonesia
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                language === 'en'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Body Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Controls & Invoice Selector */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Pilih File Invoice */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              1. Pilih Invoice yang Akan Dikirim ke Villa
            </label>
            <select
              value={selectedInvoice.id}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {activeInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.villaName} ({formatRupiah(inv.totalAmount)})
                </option>
              ))}
            </select>
          </div>

          {/* Pilihan Bahasa Khusus AI Kirim WA: Indonesia vs English */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              2. Pilihan Bahasa AI Kirim WA (Indonesia / English)
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => onLanguageChange('id')}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  language === 'id'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Indonesia
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  language === 'en'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* 3. Kata Sapaan Waktu Otomatis Mengikuti Jam Perangkat */}
          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-slate-800">
                  Sapaan Otomatis Jam {currentClockStr}
                </div>
                <div className="text-teal-800 font-semibold">
                  {language === 'en' ? translateGreetingToEnglish(greetingTime) : greetingTime}
                </div>
              </div>
            </div>
            <span className="text-xs text-teal-700 font-medium">Menyesuaikan Jam Otomatis</span>
          </div>

          {/* 3. Tujuan Pengiriman File Invoice */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              3. Tujuan Pengiriman Pesan & File
            </label>
            <select
              value={messagePurpose}
              onChange={(e) => setMessagePurpose(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="Pengiriman File Invoice Baru & Rincian Barang">
                Kirim File Invoice Baru & Info Pengiriman Barang
              </option>
              <option value="Pengingat Jatuh Tempo Tagihan Invoice (Follow-Up Sopan)">
                Follow-Up / Pengingat Jatuh Tempo Pembayaran Invoice
              </option>
              <option value="Konfirmasi Pelunasan Invoice & Ucapan Terima Kasih">
                Kirim Bukti Invoice Lunas & Terima Kasih
              </option>
            </select>
          </div>

          {/* 4. Gaya Bahasa & Nomor WA Tujuan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Gaya Bahasa AI</label>
              <select
                value={toneStyle}
                onChange={(e) => setToneStyle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="Profesional, Sopan & Ramah khas Hospitality Bali">
                  Profesional & Ramah Bali
                </option>
                <option value="Formal Korporat Manajemen Hotel & Resort">
                  Formal Manajemen Resort
                </option>
                <option value="Akrab & Santun (Sapaan Bli / Ibu / Bapak PIC Villa)">
                  Akrab & Santun (Khas Partner)
                </option>
                <option value="Singkat, Padat & Langsung ke Inti Tagihan">
                  Singkat & Padat
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                No. WhatsApp PIC Villa
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* 5. Catatan Tambahan Opsional untuk AI */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pesan Khusus Tambahan (Opsional untuk dimasukkan AI)
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Contoh: Barang sudah diterima security villa jam 10 pagi tadi..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>

          {/* Button Generate Custom AI Variation */}
          <button
            type="button"
            onClick={handleGenerateWithAI}
            disabled={isGeneratingAI}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            {isGeneratingAI ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                <span>AI Sedang Menyusun Kalimat Terbaik...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-teal-400" />
                <span>Susun Ulang / Variasikan Kalimat dengan AI</span>
              </>
            )}
          </button>

          {aiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {aiError}
            </div>
          )}

          {/* Step-by-step Checklist */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
            <div className="font-bold text-slate-800">
              Panduan Mengirim File Invoice + Pesan ke WhatsApp:
            </div>
            <ul className="space-y-1 text-slate-600 list-decimal list-inside">
              {aiChecklist.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right 7 Cols: Live WhatsApp Preview & Send Actions */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800">
                Pratinjau Pesan Pengantar File Invoice (
                {language === 'en' ? translateGreetingToEnglish(greetingTime) : greetingTime})
              </div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Penerima: {selectedInvoice.villaContact} · {selectedInvoice.villaName}
              </div>
            </div>

            {/* Attachment Simulation Header showing which Invoice file is selected */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-950 truncate font-mono">
                    {selectedInvoice.invoiceNumber.replace(/\//g, '_')}_{selectedInvoice.villaName.replace(/\s+/g, '_')}.pdf
                  </div>
                  <div className="text-xs text-emerald-800">
                    Nilai Invoice: {formatRupiah(selectedInvoice.totalAmount)} · {selectedInvoice.items.length} Barang
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const runDownload = () =>
                      downloadInvoicePDF(selectedInvoice, supplier, 'INVOICE', language);
                    if (onRequestPrintPassword) {
                      onRequestPrintPassword(runDownload);
                    } else {
                      runDownload();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {language === 'en'
                      ? 'Unduh PDF (English)'
                      : 'Unduh File PDF ke Perangkat'}
                  </span>
                </button>

                {onOpenPrintPreview && (
                  <button
                    type="button"
                    onClick={() => onOpenPrintPreview(selectedInvoice)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Lihat / Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Editable WhatsApp Message Box */}
            <textarea
              rows={15}
              value={whatsappText}
              onChange={(e) => setWhatsappText(e.target.value)}
              className="w-full p-4 text-xs font-sans leading-relaxed bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Pesan Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Kata Pengantar WhatsApp</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2.5">
              <a
                href={waWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  navigator.clipboard.writeText(whatsappText);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Buka WhatsApp PIC Villa & Kirim Pesan</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AIWhatsAppSenderModalProps {
  invoice: Invoice | null;
  invoices: Invoice[];
  clients: VillaClient[];
  supplier: SupplierProfile;
  language: MessageLanguage;
  onLanguageChange: (lang: MessageLanguage) => void;
  onClose: () => void;
  onOpenPrintPreview: (invoice: Invoice) => void;
  onRequestPrintPassword?: (action: () => void) => void;
}

export const AIWhatsAppSenderModal: React.FC<AIWhatsAppSenderModalProps> = ({
  invoice,
  invoices,
  clients,
  supplier,
  language,
  onLanguageChange,
  onClose,
  onOpenPrintPreview,
  onRequestPrintPassword,
}) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto shadow-2xl rounded-xl">
        <AIWhatsAppInvoicePanel
          invoices={invoices}
          clients={clients}
          supplier={supplier}
          language={language}
          onLanguageChange={onLanguageChange}
          initialInvoiceId={invoice.id}
          onOpenPrintPreview={(inv) => {
            onClose();
            onOpenPrintPreview(inv);
          }}
          onRequestPrintPassword={onRequestPrintPassword}
          onCloseModal={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
