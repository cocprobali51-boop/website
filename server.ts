import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // 1. Endpoint: AI Business Insights, Profit Optimization, Restock Plan & WhatsApp Reminder Generator
  app.post('/api/ai/business-analysis', async (req, res) => {
    try {
      const { products, invoices, clients, focusTopic } = req.body;
      const ai = getGenAIClient();

      const prompt = `Anda adalah Konsultan Bisnis & Analis Keuangan Senior khusus usaha Supplier Villa & Hospitality di Bali (KaryaVilla Supply).
Berikut adalah data operasional terkini dari sistem pengguna:

DATA STOK GUDANG & HPP:
${JSON.stringify(products, null, 2)}

DATA INVOICE & LABA TRANSAKSI:
${JSON.stringify(invoices, null, 2)}

DATA MITRA VILLA:
${JSON.stringify(clients, null, 2)}

FOKUS ANALISIS YANG DIMINTA: ${focusTopic || 'Analisis Menyeluruh Laba, Stok & Arus Kas'}

Berikan analisis bisnis yang tajam, konkret, menggunakan angka Rupiah dari data di atas, dan langsung dapat ditindaklanjuti oleh pemilik bisnis supplier villa.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description: 'Ringkasan eksekutif kondisi keuntungan, margin, dan kesehatan stok saat ini (2-3 kalimat padat dengan angka aktual).',
              },
              profitInsights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                    impactEstimate: { type: Type.STRING, description: 'Estimasi dampak ke laba atau kas dalam Rupiah / persentase' },
                  },
                },
                description: '3 temuan dan strategi peningkatan keuntungan & optimasi harga jual vs HPP.',
              },
              restockRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sku: { type: Type.STRING },
                    productName: { type: Type.STRING },
                    currentStock: { type: Type.NUMBER },
                    recommendedOrderQty: { type: Type.NUMBER },
                    estimatedCapitalNeeded: { type: Type.NUMBER },
                    reason: { type: Type.STRING },
                  },
                },
                description: 'Rekomendasi barang yang wajib segera direstok beserta jumlah order dan estimasi modal.',
              },
              collectionDrafts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    villaName: { type: Type.STRING },
                    invoiceNumber: { type: Type.STRING },
                    unpaidAmount: { type: Type.NUMBER },
                    whatsappMessage: {
                      type: Type.STRING,
                      description: 'Draft pesan WhatsApp yang sopan, profesional, dan siap kirim kepada PIC Villa untuk mengingatkan pembayaran invoice.',
                    },
                  },
                },
                description: 'Draft pesan penagihan WhatsApp untuk invoice yang belum lunas (UNPAID atau PARTIAL).',
              },
            },
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/ai/business-analysis:', error);
      res.status(500).json({
        error: error?.message || 'Gagal menjalankan analisis AI. Pastikan konfigurasi GEMINI_API_KEY aktif.',
      });
    }
  });

  // 2. Endpoint: AI Smart WhatsApp Order Parser -> Draft Invoice
  app.post('/api/ai/parse-order', async (req, res) => {
    try {
      const { rawOrderText, products, clients } = req.body;
      if (!rawOrderText || typeof rawOrderText !== 'string') {
        res.status(400).json({ error: 'Teks pesanan tidak boleh kosong.' });
        return;
      }

      const ai = getGenAIClient();

      const prompt = `Anda adalah sistem AI pemroses pesanan otomatis untuk bisnis Supplier Villa.
Cocokkan teks pesan pesanan (misal dari chat WhatsApp Purchasing Villa) berikut ke dalam daftar Klien Villa dan Katalog Produk Gudang yang tersedia.

TEKS PESANAN MASUK:
"${rawOrderText}"

DAFTAR MITRA VILLA TERSEDIA:
${JSON.stringify(
  (clients || []).map((c: any) => ({ id: c.id, name: c.name, area: c.area })),
  null,
  2
)}

KATALOG PRODUK GUDANG TERSEDIA:
${JSON.stringify(
  (products || []).map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    sellPrice: p.sellPrice,
    costPrice: p.costPrice,
    stock: p.stock,
  })),
  null,
  2
)}

Petunjuk:
1. Jika nama villa di pesan cocok atau mirip dengan salah satu dari DAFTAR MITRA VILLA TERSEDIA, isi matchedVillaId dengan id villa tersebut. Jika merupakan villa baru yang belum ada di daftar, isi matchedVillaId dengan "NEW" dan isi newVillaName serta newVillaArea.
2. Untuk setiap barang yang dipesan, pilih productId yang paling cocok dari KATALOG PRODUK GUDANG TERSEDIA, tentukan quantity yang diminta, dan gunakan harga jual standar (atau harga khusus jika disebutkan di dalam teks).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedVillaId: {
                type: Type.STRING,
                description: 'ID villa dari daftar, atau "NEW" jika belum terdaftar.',
              },
              detectedVillaName: {
                type: Type.STRING,
                description: 'Nama villa yang terdeteksi dari pesan.',
              },
              detectedVillaArea: {
                type: Type.STRING,
                description: 'Area lokasi villa jika disebutkan (misal Canggu, Ubud, Uluwatu, Seminyak).',
              },
              paymentTermsDays: {
                type: Type.NUMBER,
                description: 'Termin jatuh tempo dalam hari (default 14 jika tidak disebutkan).',
              },
              notes: {
                type: Type.STRING,
                description: 'Catatan pengiriman atau instruksi khusus dari pesan.',
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    productId: { type: Type.STRING },
                    sku: { type: Type.STRING },
                    productName: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                  },
                },
              },
            },
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/ai/parse-order:', error);
      res.status(500).json({
        error: error?.message || 'Gagal mengekstrak pesanan dengan AI.',
      });
    }
  });

  // 3. Endpoint: Interactive AI Business Advisor Chat
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const { question, contextData } = req.body;
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
        return;
      }

      const ai = getGenAIClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `DATA OPERASIONAL BISNIS SUPPLIER VILLA SAAT INI:
${JSON.stringify(contextData, null, 2)}

PERTANYAAN PENGGUNA:
${question}`,
        config: {
          systemInstruction:
            'Anda adalah Asisten AI Pintar untuk bisnis KaryaVilla Supply (supplier perlengkapan villa di Bali). Jawab pertanyaan pemilik bisnis dengan bahasa Indonesia yang jelas, terstruktur, ramah, dan selalu mengacu pada angka nyata (stok, HPP, harga jual, margin laba, dan daftar invoice) yang diberikan dalam konteks. Gunakan poin-poin singkat agar mudah dibaca.',
        },
      });

      res.json({
        answer: response.text || 'Maaf, tidak ada respons yang dihasilkan.',
      });
    } catch (error: any) {
      console.error('Error in /api/ai/ask:', error);
      res.status(500).json({
        error: error?.message || 'Gagal menghubungi Asisten AI.',
      });
    }
  });

  // 4. Endpoint: AI WhatsApp Invoice Sender Message Generator
  app.post('/api/ai/whatsapp-invoice', async (req, res) => {
    try {
      const {
        invoice,
        supplier,
        clientPhone,
        greetingTime,
        messagePurpose,
        toneStyle,
        customNote,
        language,
      } = req.body;

      if (!invoice) {
        res.status(400).json({ error: 'Data invoice diperlukan.' });
        return;
      }

      const isEnglish = language === 'en';
      const enGreeting =
        greetingTime === 'Selamat Pagi'
          ? 'Good morning'
          : greetingTime === 'Selamat Siang' || greetingTime === 'Selamat Sore'
          ? 'Good afternoon'
          : 'Good evening';

      const ai = getGenAIClient();

      const prompt = `Anda adalah Asisten Komunikasi Bisnis dari perusahaan supplier villa "${supplier?.companyName || 'KaryaVilla Supply'}".
Buatkan pesan WhatsApp dalam ${isEnglish ? 'BAHASA INGGRIS (Natural, Polite International Hospitality English untuk klien/owner villa ekspatriat/bule di Bali)' : 'BAHASA INDONESIA'} yang siap dikirimkan kepada PIC/Owner/Manajer Villa saat kami mengirimkan lampiran file PDF Invoice.

PARAMETER PESAN:
- Bahasa Output Wajib: ${isEnglish ? 'ENGLISH (100% Bahasa Inggris yang sopan, hangat, dan profesional)' : 'BAHASA INDONESIA'}
- Waktu Sapaan Wajib: "${isEnglish ? enGreeting : greetingTime || 'Selamat Pagi'}" (Gunakan kata sapaan ini di kalimat pembuka kepada PIC/Owner Villa).
- Tujuan Pesan: "${messagePurpose || 'Pengiriman File Invoice & Rincian Tagihan'}"
- Gaya Bahasa: "${toneStyle || 'Profesional, Sopan & Ramah khas Hospitality Bali'}"
- Catatan Tambahan Pengirim: "${customNote || '-'}"

DATA INVOICE YANG DIKIRIM:
- Nomor Invoice: ${invoice.invoiceNumber}
- Nama Villa: ${invoice.villaName} (${invoice.villaArea})
- Nama PIC Penerima: ${invoice.villaContact}
- Tanggal Terbit: ${invoice.issueDate}
- Status Saat Ini: ${invoice.status}
- Daftar Barang:
${(invoice.items || [])
  .map((it: any, i: number) => `  ${i + 1}. ${it.name} — ${it.quantity} ${it.unit} x Rp ${Number(it.unitPrice).toLocaleString('id-ID')} = Rp ${Number(it.subtotal).toLocaleString('id-ID')}`)
  .join('\n')}
- Subtotal: Rp ${Number(invoice.subtotal || 0).toLocaleString('id-ID')}
- Diskon: Rp ${Number(invoice.discountAmount || 0).toLocaleString('id-ID')}
- Ongkos Kirim: Rp ${Number(invoice.shippingCost || 0).toLocaleString('id-ID')}
- PPN: Rp ${Number(invoice.taxAmount || 0).toLocaleString('id-ID')}
- Total Tagihan: Rp ${Number(invoice.totalAmount || 0).toLocaleString('id-ID')}
- Sudah Dibayar: Rp ${Number(invoice.paidAmount || 0).toLocaleString('id-ID')}
- Sisa Tagihan yang Harus Dibayar: Rp ${Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)).toLocaleString('id-ID')}

INFO PERUSAHAAN & REKENING PEMBAYARAN SUPPLIER:
- Nama Perusahaan: ${supplier?.companyName || 'KaryaVilla Supply'}
- Alamat Perusahaan: ${supplier?.address || '-'}
- No. Telepon / WhatsApp: ${supplier?.phone || '-'}
- Sosial Media: ${supplier?.socialMedia || '-'}
- Bank: ${supplier?.bankName || 'BCA'}
- No. Rekening: ${supplier?.bankAccountNumber || '-'}
- Atas Nama: ${supplier?.bankAccountName || '-'}
- Pengirim: ${supplier?.signeeName || 'Bagian Administrasi & Finance'} (${supplier?.companyName || 'KaryaVilla Supply'})

ATURAN FORMAT WHATSAPP:
1. Awali dengan sapaan waktu yang diminta ("${isEnglish ? enGreeting : greetingTime || 'Selamat Pagi'}") beserta sapaan hormat kepada PIC/Owner Villa (${invoice.villaContact}) dan nama Villa (${invoice.villaName}).
2. Sampaikan bahwa bersama pesan ini kami melampirkan file dokumen Invoice resmi (${invoice.invoiceNumber}).
3. Cantumkan rincian singkat barang yang disuplai, total nominal tagihan (gunakan format tebal WhatsApp dengan tanda bintang *Rp ...*), rekening bank tujuan pembayaran, serta permohonan konfirmasi pembayaran melalui nomor WhatsApp kami (${supplier?.phone || '-'
}).
4. Akhiri dengan kalimat terima kasih atas kerja sama yang baik dan tanda tangan pengirim.
5. Jangan gunakan markdown heading (#), gunakan format teks WhatsApp asli (*tebal* dengan satu bintang).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whatsappMessage: {
                type: Type.STRING,
                description: 'Pesan WhatsApp lengkap siap kirim dengan format *tebal* khas WhatsApp.',
              },
              shortSummary: {
                type: Type.STRING,
                description: 'Ringkasan 1 baris tentang isi pesan dan pengingat untuk melampirkan file PDF invoice.',
              },
              checklistBeforeSend: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 poin pengingat singkat sebelum mengirim chat ke pihak villa (misal: lampirkan file PDF invoice, pastikan jumlah sesuai surat jalan).',
              },
            },
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json({
        ...parsed,
        clientPhone: clientPhone || '',
      });
    } catch (error: any) {
      console.error('Error in /api/ai/whatsapp-invoice:', error);
      res.status(500).json({
        error: error?.message || 'Gagal membuat pesan WhatsApp AI.',
      });
    }
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
