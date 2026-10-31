import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Printer,
  Download,
  Send,
  Package,
  FileText,
  Bot,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Check,
  Lock,
  Unlock,
  X,
  Search,
  Home,
  ChevronRight,
  ChevronDown,
  Target,
  Activity,
  Award,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Invoice,
  PRODUCT_CATEGORIES,
  ProductItem,
  StockMovement,
  StockMovementType,
  SupplierProfile,
  VillaClient,
} from './types';
import {
  INITIAL_INVOICES,
  INITIAL_PRODUCTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SUPPLIER_PROFILE,
  INITIAL_VILLA_CLIENTS,
} from './data/initialData';
import { formatDateId, formatNumber, formatPercent, formatRupiah } from './utils/formatters';
import { DocLanguage, downloadInvoicePDF } from './utils/pdfGenerator';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { ProductFormModal, RestockModal } from './components/StockModals';
import { AIWhatsAppInvoicePanel, AIWhatsAppSenderModal } from './components/AIWhatsAppSenderModal';
import { PasswordModal } from './components/PasswordModal';

type SimpleTab =
  | 'invoices'
  | 'profit'
  | 'whatsapp_ai'
  | 'stock'
  | 'ranking'
  | 'mutations'
  | 'settings';

const STORAGE_KEYS = {
  PRODUCTS: 'kvs_products_v1',
  INVOICES: 'kvs_invoices_v1',
  MOVEMENTS: 'kvs_movements_v1',
  CLIENTS: 'kvs_clients_v1',
  SUPPLIER: 'kvs_supplier_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<SimpleTab>('invoices');

  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (saved) {
        const parsed: Invoice[] = JSON.parse(saved);
        const dayCounters: Record<string, number> = {};
        return parsed
          .slice()
          .reverse()
          .map((inv) => {
            const dateKey = (inv.issueDate || '2026-10-31').split('T')[0];
            dayCounters[dateKey] = (dayCounters[dateKey] || 0) + 1;
            if (inv.invoiceNumber.startsWith('INV/KVS/')) {
              const seq = String(dayCounters[dateKey]).padStart(3, '0');
              return {
                ...inv,
                invoiceNumber: `INV/${dateKey.replace(/-/g, '/')}/${seq}`,
              };
            }
            return inv;
          })
          .reverse();
      }
      return INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
    } catch {
      return INITIAL_STOCK_MOVEMENTS;
    }
  });

  const [clients, setClients] = useState<VillaClient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return saved ? JSON.parse(saved) : INITIAL_VILLA_CLIENTS;
    } catch {
      return INITIAL_VILLA_CLIENTS;
    }
  });

  const [supplier, setSupplier] = useState<SupplierProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIER);
      if (saved) {
        return { ...INITIAL_SUPPLIER_PROFILE, ...JSON.parse(saved) };
      }
      return INITIAL_SUPPLIER_PROFILE;
    } catch {
      return INITIAL_SUPPLIER_PROFILE;
    }
  });

  const [settingsSaved, setSettingsSaved] = useState(false);

  // Filters & Search
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [selectedVillaFilter, setSelectedVillaFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedMutationTypeFilter, setSelectedMutationTypeFilter] = useState<string>('ALL');
  const [showGoalCard, setShowGoalCard] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
      localStorage.setItem(STORAGE_KEYS.SUPPLIER, JSON.stringify(supplier));
    } catch {
      // ignore storage errors
    }
  }, [products, invoices, movements, clients, supplier]);

  // Modals State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [whatsAppModalInvoice, setWhatsAppModalInvoice] = useState<Invoice | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockTargetProduct, setRestockTargetProduct] = useState<ProductItem | null>(null);
  const [docLanguage, setDocLanguage] = useState<DocLanguage>('id');
  const [dpModalInvoice, setDpModalInvoice] = useState<Invoice | null>(null);
  const [dpInputAmount, setDpInputAmount] = useState<number>(0);
  const [hppModalInvoice, setHppModalInvoice] = useState<Invoice | null>(null);

  // Modal Tambah Pelanggan Villa / Hotel Baru
  const [isAddVillaModalOpen, setIsAddVillaModalOpen] = useState(false);
  const [newVillaForm, setNewVillaForm] = useState({
    name: '',
    area: '',
    address: '',
    contactPerson: '',
    phone: '',
  });

  // Password Protection State (Default locked for profit & print)
  const [isProfitUnlocked, setIsProfitUnlocked] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onSuccess: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onSuccess: () => {},
  });

  const handleRequestUnlockProfit = (afterUnlock?: () => void) => {
    setPasswordPrompt({
      isOpen: true,
      title: 'Buka Kunci Menu Laba & Modal HPP',
      description:
        'Masukkan password keamanan Anda untuk membuka halaman Laba Bersih dan rincian Harga Modal (HPP).',
      onSuccess: () => {
        setIsProfitUnlocked(true);
        if (afterUnlock) afterUnlock();
      },
    });
  };

  const handleOpenProfitTab = () => {
    setActiveTab('profit');
    if (!isProfitUnlocked) {
      handleRequestUnlockProfit();
    }
  };

  const handleRequestPrintPassword = (action: () => void) => {
    setPasswordPrompt({
      isOpen: true,
      title: 'Verifikasi Password Cetak / Unduh Invoice',
      description:
        'Masukkan password keamanan Anda terlebih dahulu sebelum mencetak atau menyimpan file PDF Invoice ke perangkat.',
      onSuccess: action,
    });
  };

  // Core Summary Numbers
  const activeInvoices = useMemo(
    () => invoices.filter((inv) => inv.status !== 'CANCELLED'),
    [invoices]
  );

  const filteredInvoices = useMemo(() => {
    return activeInvoices.filter((inv) => {
      if (selectedVillaFilter !== 'ALL' && inv.villaName !== selectedVillaFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'ALL') {
        const isPartial =
          inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount && inv.status !== 'PAID';
        if (selectedStatusFilter === 'PAID' && inv.status !== 'PAID') return false;
        if (selectedStatusFilter === 'PARTIAL' && !isPartial) return false;
        if (selectedStatusFilter === 'UNPAID' && (inv.status === 'PAID' || isPartial)) return false;
      }
      if (sidebarSearch.trim()) {
        const q = sidebarSearch.toLowerCase();
        const matchInv = inv.invoiceNumber.toLowerCase().includes(q);
        const matchVilla = inv.villaName.toLowerCase().includes(q);
        const matchItem = inv.items.some((it) => it.name.toLowerCase().includes(q));
        if (!matchInv && !matchVilla && !matchItem) return false;
      }
      return true;
    });
  }, [activeInvoices, selectedVillaFilter, selectedStatusFilter, sidebarSearch]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategoryFilter !== 'ALL' && p.category !== selectedCategoryFilter) {
          return false;
        }
        if (sidebarSearch.trim()) {
          const q = sidebarSearch.toLowerCase();
          const tcMatch = p.threadCount ? p.threadCount.toLowerCase().includes(q) : false;
          const sizeMatch = p.size ? p.size.toLowerCase().includes(q) : false;
          if (
            !p.name.toLowerCase().includes(q) &&
            !p.sku.toLowerCase().includes(q) &&
            !tcMatch &&
            !sizeMatch
          ) {
            return false;
          }
        }
        return true;
      })
      .slice()
      .sort((a, b) => a.stock - b.stock);
  }, [products, selectedCategoryFilter, sidebarSearch]);

  const rankedVillas = useMemo(() => {
    const villaMap = new Map<
      string,
      {
        id: string;
        name: string;
        area: string;
        orderCount: number;
        totalItemsQty: number;
        totalSpent: number;
        totalProfit: number;
      }
    >();

    clients.forEach((c) => {
      villaMap.set(c.name.toLowerCase(), {
        id: c.id,
        name: c.name,
        area: c.area || c.address || 'Bali',
        orderCount: 0,
        totalItemsQty: 0,
        totalSpent: 0,
        totalProfit: 0,
      });
    });

    activeInvoices.forEach((inv) => {
      const key = inv.villaName.trim().toLowerCase();
      const existing = villaMap.get(key) || {
        id: inv.villaId || key,
        name: inv.villaName,
        area: inv.villaArea || inv.villaAddress || 'Bali',
        orderCount: 0,
        totalItemsQty: 0,
        totalSpent: 0,
        totalProfit: 0,
      };
      const itemsQty = inv.items.reduce((s, it) => s + it.quantity, 0);
      existing.orderCount += 1;
      existing.totalItemsQty += itemsQty;
      existing.totalSpent += inv.totalAmount;
      existing.totalProfit += inv.netProfit;
      villaMap.set(key, existing);
    });

    return Array.from(villaMap.values())
      .filter((v) => {
        if (!sidebarSearch.trim()) return true;
        const q = sidebarSearch.toLowerCase();
        return v.name.toLowerCase().includes(q) || v.area.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (b.orderCount !== a.orderCount) {
          return b.orderCount - a.orderCount; // Paling sering belanja di urutan pertama
        }
        if (b.totalProfit !== a.totalProfit) {
          return b.totalProfit - a.totalProfit; // Lalu keuntungan terbesar
        }
        return b.totalSpent - a.totalSpent;
      });
  }, [clients, activeInvoices, sidebarSearch]);

  const filteredMovements = useMemo(() => {
    return movements
      .filter((m) => {
        if (selectedMutationTypeFilter !== 'ALL' && m.type !== selectedMutationTypeFilter) {
          return false;
        }
        if (sidebarSearch.trim()) {
          const q = sidebarSearch.toLowerCase();
          const matchName = m.productName.toLowerCase().includes(q);
          const matchSku = m.sku.toLowerCase().includes(q);
          const matchRef = m.reference.toLowerCase().includes(q);
          const matchNotes = m.notes.toLowerCase().includes(q);
          const matchDate = m.date.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchRef && !matchNotes && !matchDate) {
            return false;
          }
        }
        return true;
      })
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [movements, selectedMutationTypeFilter, sidebarSearch]);

  const mutationStats = useMemo(() => {
    const inMovements = movements.filter((m) => m.type === 'IN');
    const outMovements = movements.filter((m) => m.type === 'OUT');
    const totalInQty = inMovements.reduce((s, m) => s + m.quantity, 0);
    const totalOutQty = outMovements.reduce((s, m) => s + m.quantity, 0);
    return {
      inCount: inMovements.length,
      outCount: outMovements.length,
      totalInQty,
      totalOutQty,
      totalRecords: movements.length,
    };
  }, [movements]);

  const summary = useMemo(() => {
    const totalOmzet = activeInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const totalModal = activeInvoices.reduce((s, inv) => s + inv.totalCostOfGoods, 0);
    const totalUntung = activeInvoices.reduce((s, inv) => s + inv.netProfit, 0);
    const totalTerkumpul = activeInvoices.reduce((s, inv) => s + inv.paidAmount, 0);
    const belumDibayar = activeInvoices.reduce(
      (s, inv) => s + Math.max(0, inv.totalAmount - inv.paidAmount),
      0
    );
    const paidRatioPct = totalOmzet > 0 ? Math.round((totalTerkumpul / totalOmzet) * 100) : 100;
    const avgMarginPct = totalOmzet > 0 ? (totalUntung / totalOmzet) * 100 : 0;
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    return {
      totalOmzet,
      totalModal,
      totalUntung,
      totalTerkumpul,
      belumDibayar,
      paidRatioPct,
      avgMarginPct,
      lowStockCount,
    };
  }, [activeInvoices, products]);

  // Handlers
  const handleCreateInvoice = (newInvoice: Invoice, newClient?: VillaClient) => {
    if (newClient) {
      setClients((prev) => [newClient, ...prev]);
    }

    const todayStr = newInvoice.issueDate || new Date().toISOString().split('T')[0];
    const generatedMovements: StockMovement[] = [];

    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const line = newInvoice.items.find((i) => i.productId === prod.id);
        if (!line) return prod;
        const nextStock = Math.max(0, prod.stock - line.quantity);
        generatedMovements.push({
          id: `mov-inv-${Date.now()}-${prod.id}`,
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          unit: prod.unit,
          type: 'OUT',
          quantity: line.quantity,
          previousStock: prod.stock,
          newStock: nextStock,
          unitCost: line.costPriceAtSale,
          reference: newInvoice.invoiceNumber,
          date: todayStr,
          notes: `Pengurangan barang keluar untuk Invoice ${newInvoice.villaName}`,
        });
        return {
          ...prod,
          stock: nextStock,
          updatedAt: todayStr,
        };
      })
    );

    if (generatedMovements.length > 0) {
      setMovements((prev) => [...generatedMovements, ...prev]);
    }

    setInvoices((prev) => [newInvoice, ...prev]);
    setWhatsAppModalInvoice(newInvoice);
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    const oldInvoice = invoices.find((inv) => inv.id === updatedInvoice.id);
    if (oldInvoice) {
      setProducts((prevProducts) =>
        prevProducts.map((prod) => {
          const oldQty = oldInvoice.items
            .filter((i) => i.productId === prod.id)
            .reduce((s, i) => s + i.quantity, 0);
          const newQty = updatedInvoice.items
            .filter((i) => i.productId === prod.id)
            .reduce((s, i) => s + i.quantity, 0);
          if (oldQty === newQty) return prod;
          return {
            ...prod,
            stock: Math.max(0, prod.stock + oldQty - newQty),
            updatedAt: updatedInvoice.issueDate,
          };
        })
      );
    }

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
    );
    setPreviewInvoice((prev) =>
      prev && prev.id === updatedInvoice.id ? updatedInvoice : prev
    );
  };

  const handleMarkInvoicePaid = (invoiceId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: 'PAID', paidAmount: inv.totalAmount, paidDate: todayStr }
          : inv
      )
    );
    setPreviewInvoice((prev) =>
      prev && prev.id === invoiceId
        ? { ...prev, status: 'PAID', paidAmount: prev.totalAmount, paidDate: todayStr }
        : prev
    );
  };

  const handleOpenDPModal = (inv: Invoice) => {
    setDpModalInvoice(inv);
    setDpInputAmount(
      inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount
        ? inv.paidAmount
        : Math.round(inv.totalAmount * 0.5)
    );
  };

  const handleSaveDPPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dpModalInvoice) return;
    const clampedDP = Math.min(
      dpModalInvoice.totalAmount,
      Math.max(0, Math.round(dpInputAmount))
    );
    const todayStr = new Date().toISOString().split('T')[0];
    const nextStatus =
      clampedDP >= dpModalInvoice.totalAmount && dpModalInvoice.totalAmount > 0
        ? 'PAID'
        : clampedDP > 0
        ? 'PARTIAL'
        : 'UNPAID';

    const updatedInv: Invoice = {
      ...dpModalInvoice,
      status: nextStatus,
      paidAmount: clampedDP,
      paidDate: nextStatus === 'PAID' ? todayStr : undefined,
    };

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updatedInv.id ? updatedInv : inv))
    );
    setPreviewInvoice((prev) =>
      prev && prev.id === updatedInv.id ? updatedInv : prev
    );
    setDpModalInvoice(null);
  };

  const handleSaveHPPModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hppModalInvoice) return;
    const updatedItems = hppModalInvoice.items.map((it) => {
      const totalCost = it.quantity * it.costPriceAtSale;
      return {
        ...it,
        totalCost,
        itemProfit: it.subtotal - totalCost,
      };
    });
    const totalCostOfGoods = updatedItems.reduce((s, it) => s + it.totalCost, 0);
    const netProfit = hppModalInvoice.totalAmount - totalCostOfGoods;
    const profitMarginPct =
      hppModalInvoice.totalAmount > 0 ? (netProfit / hppModalInvoice.totalAmount) * 100 : 0;

    const updatedInv: Invoice = {
      ...hppModalInvoice,
      items: updatedItems,
      totalCostOfGoods,
      netProfit,
      profitMarginPct,
    };

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === updatedInv.id ? updatedInv : inv))
    );
    setHppModalInvoice(null);
  };

  const handleCancelInvoice = (invoiceId: string) => {
    const targetInv = invoices.find((inv) => inv.id === invoiceId);
    if (!targetInv || targetInv.status === 'CANCELLED') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const returnMovements: StockMovement[] = [];

    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const line = targetInv.items.find((i) => i.productId === prod.id);
        if (!line) return prod;
        const nextStock = prod.stock + line.quantity;
        returnMovements.push({
          id: `mov-ret-${Date.now()}-${prod.id}`,
          productId: prod.id,
          sku: prod.sku,
          productName: prod.name,
          unit: prod.unit,
          type: 'IN',
          quantity: line.quantity,
          previousStock: prod.stock,
          newStock: nextStock,
          unitCost: line.costPriceAtSale,
          reference: `BATAL-${targetInv.invoiceNumber}`,
          date: todayStr,
          notes: `Pengembalian stok dari pembatalan invoice ${targetInv.villaName}`,
        });
        return { ...prod, stock: nextStock };
      })
    );

    if (returnMovements.length > 0) {
      setMovements((prev) => [...returnMovements, ...prev]);
    }

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'CANCELLED', paidAmount: 0 } : inv))
    );
    setPreviewInvoice(null);
  };

  const handleSaveProduct = (savedProduct: ProductItem, isNew: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (isNew) {
      setProducts((prev) => [savedProduct, ...prev]);
      if (savedProduct.stock > 0) {
        setMovements((prev) => [
          {
            id: `mov-new-${Date.now()}`,
            productId: savedProduct.id,
            sku: savedProduct.sku,
            productName: savedProduct.name,
            unit: savedProduct.unit,
            type: 'IN',
            quantity: savedProduct.stock,
            previousStock: 0,
            newStock: savedProduct.stock,
            unitCost: savedProduct.costPrice,
            reference: 'STOK-AWAL',
            date: todayStr,
            notes: `Penambahan barang baru (${savedProduct.supplierSource})`,
          },
          ...prev,
        ]);
      }
    } else {
      const existing = products.find((p) => p.id === savedProduct.id);
      if (existing && existing.stock !== savedProduct.stock) {
        const diff = savedProduct.stock - existing.stock;
        setMovements((prev) => [
          {
            id: `mov-edit-${Date.now()}`,
            productId: savedProduct.id,
            sku: savedProduct.sku,
            productName: savedProduct.name,
            unit: savedProduct.unit,
            type: diff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(diff),
            previousStock: existing.stock,
            newStock: savedProduct.stock,
            unitCost: savedProduct.costPrice,
            reference: 'EDIT-BARANG',
            date: todayStr,
            notes:
              diff > 0
                ? 'Penambahan jumlah stok dari menu Edit Barang'
                : 'Pengurangan jumlah stok dari menu Edit Barang',
          },
          ...prev,
        ]);
      }
      setProducts((prev) => prev.map((p) => (p.id === savedProduct.id ? savedProduct : p)));
    }
  };

  const handleConfirmStockMovement = (
    productId: string,
    type: StockMovementType,
    quantity: number,
    newCostPrice: number,
    reference: string,
    notes: string,
    customDate?: string
  ) => {
    const dateStr = customDate || new Date().toISOString().split('T')[0];
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const nextStock =
      type === 'IN'
        ? target.stock + quantity
        : type === 'OUT'
        ? Math.max(0, target.stock - quantity)
        : Math.max(0, quantity);

    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: nextStock,
              costPrice: newCostPrice > 0 ? newCostPrice : p.costPrice,
              updatedAt: dateStr,
            }
          : p
      )
    );

    setMovements((prev) => [
      {
        id: `mov-${Date.now()}`,
        productId: target.id,
        sku: target.sku,
        productName: target.name,
        unit: target.unit,
        type,
        quantity,
        previousStock: target.stock,
        newStock: nextStock,
        unitCost: newCostPrice,
        reference,
        date: dateStr,
        notes,
      },
      ...prev,
    ]);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const handleSaveNewVillaClient = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newVillaForm.name.trim();
    if (!cleanName) return;

    const newClient: VillaClient = {
      id: `villa-${Date.now()}`,
      name: cleanName,
      area: newVillaForm.area.trim() || 'Bali',
      address: newVillaForm.address.trim() || newVillaForm.area.trim() || 'Bali',
      contactPerson: newVillaForm.contactPerson.trim() || 'Purchasing / Manager',
      phone: newVillaForm.phone.trim() || '-',
      email: '-',
      paymentTerms: 'Net 7 Days',
    };

    setClients((prev) => {
      const exists = prev.some((c) => c.name.toLowerCase() === cleanName.toLowerCase());
      if (exists) {
        return prev.map((c) =>
          c.name.toLowerCase() === cleanName.toLowerCase() ? { ...c, ...newClient, id: c.id } : c
        );
      }
      return [newClient, ...prev];
    });

    setNewVillaForm({
      name: '',
      area: '',
      address: '',
      contactPerson: '',
      phone: '',
    });
    setIsAddVillaModalOpen(false);
  };

  const uniqueVillaNames = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => set.add(c.name));
    activeInvoices.forEach((inv) => set.add(inv.villaName));
    return Array.from(set);
  }, [clients, activeInvoices]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>(PRODUCT_CATEGORIES);
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  const activeTabMeta = {
    invoices: {
      crumb: 'Invoice Tagihan',
      title: 'Daftar Invoice & Pembayaran Villa',
      subtitle:
        'Kelola tagihan pelanggan villa, pembayaran DP, status pelunasan, dan unduh cetakan PDF.',
    },
    profit: {
      crumb: 'Laba & Keuntungan',
      title: 'Laporan Laba Bersih & Modal HPP',
      subtitle:
        'Menu khusus pemilik usaha untuk memantau keuntungan bersih, modal barang (HPP), dan margin per invoice.',
    },
    whatsapp_ai: {
      crumb: 'AI Kirim WhatsApp',
      title: 'Pengirim WhatsApp AI (Indonesia & English)',
      subtitle: 'Buat pesan pengantar tagihan & konfirmasi DP otomatis menyesuaikan waktu setempat.',
    },
    stock: {
      crumb: 'Stok Gudang',
      title: 'Stok Barang Gudang (Urut Paling Sedikit)',
      subtitle:
        'Daftar stok barang diurutkan otomatis dari jumlah sisa stok yang paling sedikit ke paling banyak.',
    },
    ranking: {
      crumb: 'Peringkat Villa & Hotel',
      title: 'Peringkat Belanja Villa & Hotel + Total Untung',
      subtitle:
        'Urutan pelanggan Villa & Hotel yang paling sering berbelanja beserta total nilai belanja dan keuntungan bersih Anda.',
    },
    mutations: {
      crumb: 'Mutasi Barang',
      title: 'Riwayat Penambahan & Pengurangan Barang',
      subtitle:
        'Catatan history lengkap setiap penambahan barang masuk dan pengurangan barang keluar beserta tanggalnya.',
    },
    settings: {
      crumb: 'Pengaturan',
      title: 'Pengaturan Perusahaan & Keamanan',
      subtitle: 'Ubah kop surat invoice, nomor rekening bank, nomor WhatsApp, dan password keamanan.',
    },
  }[activeTab];

  // Laurel Emblem SVG helper matching the gold/silver/bronze badges in the reference UI
  const renderLaurelBadge = (
    variant: 'gold' | 'silver' | 'bronze',
    icon: React.ReactNode
  ) => {
    const colors = {
      gold: {
        ring: 'border-amber-300 bg-amber-50/80 text-amber-600',
        inner: 'bg-amber-100 text-amber-700',
      },
      silver: {
        ring: 'border-slate-300 bg-slate-50 text-slate-600',
        inner: 'bg-slate-200/80 text-slate-700',
      },
      bronze: {
        ring: 'border-orange-300 bg-orange-50/80 text-orange-700',
        inner: 'bg-orange-100 text-orange-800',
      },
    }[variant];

    return (
      <div
        className={`w-14 h-14 rounded-full border-2 border-dashed ${colors.ring} flex items-center justify-center shrink-0 p-1`}
      >
        <div
          className={`w-10 h-10 rounded-full ${colors.inner} flex items-center justify-center shadow-2xs`}
        >
          {icon}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB] text-slate-900 flex flex-col lg:p-3">
      {/* Main Framed Application Shell matching Reference Screenshot */}
      <div className="flex-1 bg-white lg:rounded-2xl shadow-xl border border-slate-200/80 flex flex-col lg:flex-row overflow-hidden min-h-[calc(100vh-1.5rem)]">
        {/* =========================================================
            LEFT DARK NAVY SIDEBAR (#0F172A)
        ========================================================= */}
        <aside className="w-full lg:w-[260px] bg-[#0F172A] text-slate-300 flex flex-col justify-between shrink-0 select-none">
          {/* Top Brand + Search + Navigation */}
          <div className="p-5 space-y-5">
            {/* Brand Header */}
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('invoices');
              }}
              className="flex items-center gap-3 px-1 group"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="w-4 h-4"
                >
                  <path d="M12 3L3 20h18L12 3z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 10l-4 7h8l-4-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-bold tracking-[0.2em] text-white uppercase truncate">
                {supplier.companyName
                  ? supplier.companyName.replace(/^CV\s+/i, '').split(' ')[0]
                  : 'KARYAVILLA'}
              </span>
            </a>

            {/* Dark Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari invoice, villa..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#1E293B] border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Primary Navigation Links — Invoice and Laba are Separate Options */}
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'invoices'
                    ? 'bg-[#1E293B] text-white font-semibold shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Invoice Tagihan</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeTab === 'invoices' ? 'text-slate-200 rotate-0' : 'text-slate-500 -rotate-90'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={handleOpenProfitTab}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'profit'
                    ? 'bg-[#1E293B] text-white font-semibold shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Laba & Keuntungan</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {!isProfitUnlocked && <Lock className="w-3 h-3 text-slate-400" />}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      activeTab === 'profit' ? 'text-slate-200 rotate-0' : 'text-slate-500 -rotate-90'
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('whatsapp_ai')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'whatsapp_ai'
                    ? 'bg-[#1E293B] text-white font-semibold shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span>AI Kirim WA</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeTab === 'whatsapp_ai'
                      ? 'text-slate-200 rotate-0'
                      : 'text-slate-500 -rotate-90'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'stock'
                    ? 'bg-[#1E293B] text-white font-semibold shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-sky-400" />
                  <span>
                    Stok Barang {summary.lowStockCount > 0 ? `(${summary.lowStockCount})` : ''}
                  </span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeTab === 'stock' ? 'text-slate-200 rotate-0' : 'text-slate-500 -rotate-90'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ranking')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'ranking'
                    ? 'bg-[#1E293B] text-white font-semibold shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Peringkat Villa & Hotel</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeTab === 'ranking' ? 'text-slate-200 rotate-0' : 'text-slate-500 -rotate-90'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mutations')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'mutations'
                    ? 'bg-[#1E293B] text-white font-semibold shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <span>Mutasi Barang</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeTab === 'mutations'
                      ? 'text-slate-200 rotate-0'
                      : 'text-slate-500 -rotate-90'
                  }`}
                />
              </button>
            </nav>
          </div>

          {/* Bottom Sidebar Utilities + Progress Card + User Profile */}
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-[#1E293B] text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Pengaturan</span>
                </span>
              </button>
            </div>

            {/* Goal / Collection Progress Card (Matching bottom-left card in screenshot) */}
            {showGoalCard && (
              <div className="bg-[#1E293B] border border-slate-700/70 rounded-xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-bold text-white">Target Pelunasan</div>
                  <button
                    type="button"
                    onClick={() => setShowGoalCard(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Terkumpul <strong>{summary.paidRatioPct}%</strong> dari total tagihan. Sisa piutang:{' '}
                  <span className="font-mono text-white">{formatRupiah(summary.belumDibayar)}</span>
                </p>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(8, summary.paidRatioPct))}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatusFilter('UNPAID');
                      setActiveTab('invoices');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Cek Piutang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatusFilter('ALL');
                      setActiveTab('whatsapp_ai');
                    }}
                    className="text-white hover:underline"
                  >
                    Tagih via WA AI
                  </button>
                </div>
              </div>
            )}

            {/* User Profile Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {(supplier.signeeName || 'KV')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {supplier.signeeName || 'Admin Supplier'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {supplier.email || 'sales@karyavilla.id'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                title="Pengaturan Profil"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================
            RIGHT MAIN CONTENT CANVAS (White Card Workspace)
        ========================================================= */}
        <main className="flex-1 bg-white overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* 1. Top Breadcrumb Bar (Matching Home > Goals > ... > Cohort 1) */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span
                className="hover:text-slate-700 cursor-pointer"
                onClick={() => setActiveTab('invoices')}
              >
                Operasional
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span>...</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-semibold rounded-md">
                {activeTabMeta.crumb}
              </span>
            </div>
          </div>

          {/* 2. Page Title & Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {activeTabMeta.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">{activeTabMeta.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
              {(activeTab === 'profit' || activeTab === 'ranking') && isProfitUnlocked && (
                <button
                  type="button"
                  onClick={() => setIsProfitUnlocked(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Kunci Kembali Menu Laba</span>
                </button>
              )}

              {activeTab === 'stock' ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Barang Baru</span>
                </button>
              ) : activeTab === 'mutations' ? (
                <button
                  type="button"
                  onClick={() => {
                    setRestockTargetProduct(products[0] || null);
                    setIsRestockModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Tambah / Kurang Barang</span>
                </button>
              ) : activeTab === 'ranking' ? (
                <button
                  type="button"
                  onClick={() => setIsAddVillaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pelanggan Villa</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingInvoice(null);
                    setIsInvoiceModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Invoice Baru</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Soft Gray Filter Bar (Matching Goal + Milestone + Reset all in reference screenshot) */}
          {(activeTab === 'invoices' ||
            activeTab === 'profit' ||
            activeTab === 'stock' ||
            activeTab === 'mutations') && (
            <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-4">
              {activeTab === 'invoices' || activeTab === 'profit' ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Pelanggan Villa
                    </label>
                    <select
                      value={selectedVillaFilter}
                      onChange={(e) => setSelectedVillaFilter(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                    >
                      <option value="ALL">
                        Semua Pelanggan Villa ({uniqueVillaNames.length} Villa)
                      </option>
                      {uniqueVillaNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Status Pembayaran & DP
                    </label>
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                    >
                      <option value="ALL">Semua Status Pembayaran</option>
                      <option value="UNPAID">Belum Dibayar</option>
                      <option value="PARTIAL">Sudah Bayar DP (Sebagian)</option>
                      <option value="PAID">Sudah Lunas (100%)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVillaFilter('ALL');
                        setSelectedStatusFilter('ALL');
                        setSidebarSearch('');
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-[#0284C7] bg-white hover:bg-sky-50 border border-[#0284C7]/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Reset semua
                    </button>
                  </div>
                </div>
              ) : activeTab === 'stock' ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Kategori Barang Gudang
                    </label>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                    >
                      <option value="ALL">Semua Kategori Barang</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Cari Nama Barang / SKU
                    </label>
                    <input
                      type="text"
                      placeholder="Ketik nama barang..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('ALL');
                        setSidebarSearch('');
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-[#0284C7] bg-white hover:bg-sky-50 border border-[#0284C7]/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Reset semua
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Filter Jenis Riwayat Mutasi
                    </label>
                    <select
                      value={selectedMutationTypeFilter}
                      onChange={(e) => setSelectedMutationTypeFilter(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                    >
                      <option value="ALL">Semua Riwayat (Penambahan & Pengurangan)</option>
                      <option value="IN">Penambahan Barang (+ Stok Masuk / Restock)</option>
                      <option value="OUT">Pengurangan Barang (- Stok Keluar / Invoice)</option>
                      <option value="ADJUST">Koreksi Stok Fisik (Stock Opname)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Cari Nama Barang / Tanggal / Referensi
                    </label>
                    <input
                      type="text"
                      placeholder="Ketik nama barang, tanggal (2026-10), atau nomor PO..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMutationTypeFilter('ALL');
                        setSidebarSearch('');
                      }}
                      className="w-full px-3.5 py-2 text-xs font-semibold text-[#0284C7] bg-white hover:bg-sky-50 border border-[#0284C7]/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Reset semua
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =======================================================
              MENU 1: INVOICE TAGIHAN (Murni Tagihan, DP & Pelunasan — Tanpa Laba/HPP)
          ======================================================= */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              {/* 3 Podium Cards Khusus Invoice & Pembayaran */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <div className="text-xs font-medium text-slate-600">
                      1. Total Tagihan Invoice
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                      {formatRupiah(summary.totalOmzet)}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({activeInvoices.length} inv)
                      </span>
                    </div>
                  </div>
                  {renderLaurelBadge('gold', <FileText className="w-5 h-5" />)}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <div className="text-xs font-medium text-slate-600">
                      2. Sudah Dibayar / DP Masuk
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1.5">
                      {formatRupiah(summary.totalTerkumpul)}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({summary.paidRatioPct}%)
                      </span>
                    </div>
                  </div>
                  {renderLaurelBadge('silver', <CheckCircle2 className="w-5 h-5" />)}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <div className="text-xs font-medium text-slate-600">
                      3. Sisa Tagihan Belum Lunas
                    </div>
                    <div className="text-2xl font-bold text-amber-700 tabular-nums mt-1.5">
                      {formatRupiah(summary.belumDibayar)}{' '}
                      <span className="text-xs font-normal text-slate-500">piutang</span>
                    </div>
                  </div>
                  {renderLaurelBadge('bronze', <Wallet className="w-5 h-5" />)}
                </div>
              </div>

              {/* Daftar Invoice Card (Murni Tagihan, DP & Sisa Tagihan) */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Daftar Transaksi Invoice ({filteredInvoices.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Klik <strong>Bayar DP</strong> untuk mencatat uang muka, <strong>PDF</strong> untuk menyimpan ke perangkat, atau <strong>WA AI</strong>.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-10 text-center">#</th>
                        <th className="py-3 px-4">Pelanggan Villa & No. Invoice</th>
                        <th className="py-3 px-4">Status Pembayaran</th>
                        <th className="py-3 px-4 text-right">Total Tagihan</th>
                        <th className="py-3 px-4 text-right">Telah Dibayar / DP</th>
                        <th className="py-3 px-4 text-right">Sisa Tagihan</th>
                        <th className="py-3 px-4 text-right">Tindakan Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredInvoices.map((inv, idx) => {
                        const hasPartialDP =
                          inv.paidAmount > 0 &&
                          inv.paidAmount < inv.totalAmount &&
                          inv.status !== 'PAID';
                        const remainingAmount = Math.max(0, inv.totalAmount - inv.paidAmount);
                        const initials = inv.villaName
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 text-center font-medium text-slate-400 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{inv.villaName}</div>
                                  <div className="text-slate-400 text-[11px] font-mono tabular-nums">
                                    {inv.invoiceNumber} · {formatDateId(inv.issueDate)} ·{' '}
                                    {inv.items.length} barang
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold">
                              {inv.status === 'PAID' ? (
                                <span className="text-emerald-700">Sudah Lunas</span>
                              ) : hasPartialDP ? (
                                <span className="text-amber-700">Sudah DP (Sebagian)</span>
                              ) : (
                                <span className="text-amber-700">Belum Lunas</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                              {formatRupiah(inv.totalAmount)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                              {inv.paidAmount > 0 ? formatRupiah(inv.paidAmount) : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-amber-800">
                              {remainingAmount > 0 ? formatRupiah(remainingAmount) : 'Rp 0'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {inv.status !== 'PAID' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDPModal(inv)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg whitespace-nowrap shrink-0"
                                    >
                                      <span>{hasPartialDP ? 'Ubah DP' : 'Bayar DP'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMarkInvoicePaid(inv.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg whitespace-nowrap shrink-0"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Lunas</span>
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInvoice(inv);
                                    setIsInvoiceModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg whitespace-nowrap shrink-0"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRequestPrintPassword(() => setPreviewInvoice(inv))
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Pratinjau</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRequestPrintPassword(() =>
                                      downloadInvoicePDF(inv, supplier, 'INVOICE', 'id')
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg whitespace-nowrap shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#0284C7]" />
                                  <span>PDF</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setWhatsAppModalInvoice(inv)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap shrink-0"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>WA AI</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              MENU 2: LABA & KEUNTUNGAN (Menu Terpisah — Dilindungi Password)
          ======================================================= */}
          {activeTab === 'profit' && (
            <div className="space-y-6">
              {!isProfitUnlocked ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto my-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900">
                      Halaman Laba & Modal HPP Terkunci
                    </h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Data keuntungan bersih dan harga modal barang (HPP) dipisahkan dari menu Invoice agar aman. Masukkan password keamanan Anda untuk membuka laporan ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRequestUnlockProfit()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg shadow-2xs transition-colors"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Masukkan Password untuk Buka Laba</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* 3 Podium Cards Khusus Laba & Modal HPP */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                      <div>
                        <div className="text-xs font-medium text-slate-600">
                          1. Total Penjualan (Omzet)
                        </div>
                        <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                          {formatRupiah(summary.totalOmzet)}{' '}
                          <span className="text-xs font-normal text-slate-500">omzet</span>
                        </div>
                      </div>
                      {renderLaurelBadge('gold', <TrendingUp className="w-5 h-5" />)}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                      <div>
                        <div className="text-xs font-medium text-slate-600">
                          2. Total Modal Barang (HPP)
                        </div>
                        <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                          {formatRupiah(summary.totalModal)}{' '}
                          <span className="text-xs font-normal text-slate-500">modal</span>
                        </div>
                      </div>
                      {renderLaurelBadge('silver', <Wallet className="w-5 h-5" />)}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                      <div>
                        <div className="text-xs font-medium text-slate-600">
                          3. Keuntungan Bersih Saya
                        </div>
                        <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1.5">
                          +{formatRupiah(summary.totalUntung)}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            ({formatPercent(summary.avgMarginPct)})
                          </span>
                        </div>
                      </div>
                      {renderLaurelBadge('bronze', <Award className="w-5 h-5" />)}
                    </div>
                  </div>

                  {/* Tabel Rincian Laba & Modal HPP per Invoice */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">
                          Rincian Modal HPP & Keuntungan Bersih per Invoice ({filteredInvoices.length})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Klik tombol <strong>Ubah Modal HPP</strong> jika Anda ingin menyesuaikan harga modal beli pada barang di invoice tertentu.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4 w-10 text-center">#</th>
                            <th className="py-3 px-4">No. Invoice & Pelanggan Villa</th>
                            <th className="py-3 px-4 text-right">Harga Jual (Tagihan)</th>
                            <th className="py-3 px-4 text-right">Modal Barang (HPP)</th>
                            <th className="py-3 px-4 text-right">Untung Bersih Saya</th>
                            <th className="py-3 px-4 text-right">Margin (%)</th>
                            <th className="py-3 px-4 text-right">Kelola HPP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredInvoices.map((inv, idx) => {
                            const initials = inv.villaName
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase();

                            return (
                              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 text-center font-medium text-slate-400 tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900">{inv.villaName}</div>
                                      <div className="text-slate-400 text-[11px] font-mono tabular-nums">
                                        {inv.invoiceNumber} · {formatDateId(inv.issueDate)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                                  {formatRupiah(inv.totalAmount)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                                  {formatRupiah(inv.totalCostOfGoods)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                                  +{formatRupiah(inv.netProfit)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600">
                                  {formatPercent(inv.profitMarginPct)}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setHppModalInvoice({
                                        ...inv,
                                        items: inv.items.map((i) => ({ ...i })),
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg whitespace-nowrap shrink-0"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Ubah Modal HPP</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2-Column Peringkat Laba per Villa & Margin per Barang (Matching Reference Leaderboard UI) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 divide-y divide-slate-100 shadow-2xs">
                      <div className="pb-3 px-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Peringkat Villa & Hotel (Frekuensi Belanja & Laba)
                        </span>
                        <span className="text-[11px] text-slate-400">Belanja & Keuntungan</span>
                      </div>
                      {rankedVillas.map((v, idx) => {
                        const initials = v.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <div
                            key={v.id}
                            className="py-3 px-2 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-5 text-xs font-medium text-slate-400 tabular-nums">
                                {idx + 1}
                              </span>
                              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {v.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  @{v.area.toLowerCase().replace(/\s+/g, '.')} ·{' '}
                                  <strong className="text-slate-700">{v.orderCount}x belanja</strong>{' '}
                                  ({formatRupiah(v.totalSpent)})
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums shrink-0">
                              +{formatRupiah(v.totalProfit)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 divide-y divide-slate-100 shadow-2xs">
                      <div className="pb-3 px-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Keuntungan per Unit Barang (Urut Stok Terendah)
                        </span>
                        <span className="text-[11px] text-slate-400">Laba / Unit</span>
                      </div>
                      {filteredProducts.slice(0, 8).map((prod, idx) => {
                        const unitProfit = prod.sellPrice - prod.costPrice;
                        return (
                          <div
                            key={prod.id}
                            className="py-3 px-2 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-5 text-xs font-medium text-slate-400 tabular-nums">
                                {idx + 1}
                              </span>
                              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {prod.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {prod.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate font-mono tabular-nums">
                                  Sisa: {prod.stock} {prod.unit} · Modal:{' '}
                                  {formatRupiah(prod.costPrice)} · Jual: {formatRupiah(prod.sellPrice)}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums shrink-0">
                              +{formatRupiah(unitProfit)}/{prod.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =======================================================
              MENU 3: STOK BARANG GUDANG (Diurut dari Jumlah Paling Sedikit)
          ======================================================= */}
          {activeTab === 'stock' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Daftar Stok Barang — Diurut dari Jumlah Paling Sedikit ({filteredProducts.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Barang dengan sisa stok paling sedikit berada di urutan paling atas (#1) agar mudah dipantau dan ditambah stoknya.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">#</th>
                      <th className="py-3 px-4">Nama Barang & Kategori</th>
                      <th className="py-3 px-4 text-center">Satuan</th>
                      <th className="py-3 px-4 text-right">Sisa Stok (Terkecil → Terbesar)</th>
                      <th className="py-3 px-4 text-right">Harga Jual Villa</th>
                      <th className="py-3 px-4 text-right">Kelola Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredProducts.map((prod, idx) => {
                      const isLow = prod.stock <= prod.minStock;
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-center font-medium text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900">{prod.name}</span>
                              {prod.threadCount && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                  {prod.threadCount}
                                </span>
                              )}
                              {prod.size && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                  Ukuran: {prod.size}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              @{prod.sku.toLowerCase()} · {prod.category}
                              {prod.threadCount ? ` · ${prod.threadCount}` : ''}
                              {prod.size ? ` · Ukuran: ${prod.size}` : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-600">{prod.unit}</td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                            <div
                              className={`text-sm font-bold ${
                                isLow ? 'text-red-600' : 'text-slate-900'
                              }`}
                            >
                              {formatNumber(prod.stock)} {prod.unit}
                            </div>
                            {isLow && (
                              <div className="text-red-600 font-sans inline-flex items-center gap-1 text-[11px]">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Stok Menipis (Min: {prod.minStock})</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                            {formatRupiah(prod.sellPrice)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setRestockTargetProduct(prod);
                                  setIsRestockModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-[#0284C7] bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg whitespace-nowrap shrink-0"
                              >
                                + Tambah Stok
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"
                                title="Ubah Harga / Nama"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =======================================================
              MENU 4: AI KIRIM WHATSAPP INVOICE
          ======================================================= */}
          {activeTab === 'whatsapp_ai' && (
            <AIWhatsAppInvoicePanel
              invoices={invoices}
              clients={clients}
              supplier={supplier}
              language={docLanguage}
              onLanguageChange={setDocLanguage}
              onOpenPrintPreview={(inv) =>
                handleRequestPrintPassword(() => setPreviewInvoice(inv))
              }
              onRequestPrintPassword={handleRequestPrintPassword}
            />
          )}

          {/* =======================================================
              MENU 5: PERINGKAT VILLA & HOTEL (BELANJA & TOTAL UNTUNG)
          ======================================================= */}
          {activeTab === 'ranking' && (
            <div className="space-y-6">
              {/* Top 3 Podium Cards: Villa & Hotel Paling Sering Belanja beserta Total Untung */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rankedVillas.slice(0, 3).map((topVilla, idx) => {
                  const badgeVariant = idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze';
                  return (
                    <div
                      key={topVilla.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {idx + 1}. {topVilla.name}
                        </div>
                        <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                          {topVilla.orderCount}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            kali belanja ({formatRupiah(topVilla.totalSpent)})
                          </span>
                        </div>
                        <div className="mt-1.5 text-xs font-mono tabular-nums">
                          {isProfitUnlocked ? (
                            <span className="font-bold text-emerald-700">
                              Total Untung: +{formatRupiah(topVilla.totalProfit)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRequestUnlockProfit()}
                              className="inline-flex items-center gap-1 text-[#0284C7] hover:underline font-sans font-semibold"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Buka Kunci Total Untung</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {renderLaurelBadge(badgeVariant, <Award className="w-5 h-5" />)}
                    </div>
                  );
                })}
              </div>

              {/* Tabel Lengkap Peringkat Villa & Hotel Belanja & Total Untung */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Daftar Peringkat Villa & Hotel Paling Sering Belanja dan Total Untung
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Diurutkan otomatis dari pelanggan yang paling sering belanja beserta akumulasi nilai belanja dan total keuntungan bersih Anda
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddVillaModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Pelanggan Villa Baru</span>
                    </button>
                    {!isProfitUnlocked && (
                      <button
                        type="button"
                        onClick={() => handleRequestUnlockProfit()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Buka Kunci Total Untung</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4 w-16">Peringkat</th>
                        <th className="py-3 px-4">Nama Villa / Hotel & Area</th>
                        <th className="py-3 px-4 text-center">Frekuensi Belanja</th>
                        <th className="py-3 px-4 text-center">Total Barang Dibeli</th>
                        <th className="py-3 px-4 text-right">Total Nilai Belanja</th>
                        <th className="py-3 px-4 text-right">Total Untung Saya</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {rankedVillas.map((v, idx) => {
                        const initials = v.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <tr
                            key={v.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-700 tabular-nums">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  idx === 0
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : idx === 1
                                    ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                    : idx === 2
                                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-sky-50 border border-sky-200 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{v.name}</div>
                                  <div className="text-[11px] text-slate-500">
                                    Area: {v.area}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 tabular-nums">
                                {v.orderCount}x Belanja
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-700">
                              {formatNumber(v.totalItemsQty)} Unit
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                              {formatRupiah(v.totalSpent)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                              {isProfitUnlocked ? (
                                <span className="font-bold text-emerald-700">
                                  +{formatRupiah(v.totalProfit)}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRequestUnlockProfit()}
                                  className="inline-flex items-center gap-1 text-slate-400 hover:text-[#0284C7] font-sans text-xs"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Rp •••••••</span>
                                </button>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVillaFilter(v.name);
                                  setActiveTab('invoices');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md whitespace-nowrap shrink-0"
                              >
                                <span>Lihat Invoice</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              MENU 6: MUTASI BARANG (HISTORY PENAMBAHAN & PENGURANGAN BARANG BESERTA TANGGAL)
          ======================================================= */}
          {activeTab === 'mutations' && (
            <div className="space-y-6">
              {/* 3 Kartu Podium Ringkasan History Mutasi Barang */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <div className="text-xs font-medium text-slate-600">
                      1. History Penambahan Barang (+ Masuk)
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1.5">
                      +{formatNumber(mutationStats.totalInQty)}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        unit ({mutationStats.inCount}x penambahan)
                      </span>
                    </div>
                  </div>
                  {renderLaurelBadge('gold', <TrendingUp className="w-5 h-5" />)}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <div className="text-xs font-medium text-slate-600">
                      2. History Pengurangan Barang (- Keluar)
                    </div>
                    <div className="text-2xl font-bold text-amber-700 tabular-nums mt-1.5">
                      -{formatNumber(mutationStats.totalOutQty)}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        unit ({mutationStats.outCount}x pengurangan)
                      </span>
                    </div>
                  </div>
                  {renderLaurelBadge('silver', <Package className="w-5 h-5" />)}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <div className="text-xs font-medium text-slate-600">
                      3. Total Catatan History Mutasi
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                      {mutationStats.totalRecords}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        riwayat tercatat beserta tanggal
                      </span>
                    </div>
                  </div>
                  {renderLaurelBadge('bronze', <Activity className="w-5 h-5" />)}
                </div>
              </div>

              {/* Tabel History Penambahan Barang dan Pengurangan Barang Beserta Tanggal */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      History Penambahan Barang & Pengurangan Barang Gudang
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Setiap aktivitas penambahan stok masuk maupun pengurangan barang keluar tercatat otomatis beserta tanggalnya
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRestockTargetProduct(products[0] || null);
                        setIsRestockModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Catat Tambah / Kurang Barang</span>
                    </button>
                  </div>
                </div>

                {filteredMovements.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Belum ada riwayat mutasi barang yang sesuai dengan filter pencarian.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4 w-12">No</th>
                          <th className="py-3 px-4">Tanggal</th>
                          <th className="py-3 px-4">Jenis Mutasi</th>
                          <th className="py-3 px-4">Nama Barang & SKU</th>
                          <th className="py-3 px-4 text-right">Jumlah (+ / -)</th>
                          <th className="py-3 px-4 text-center">Perubahan Stok Gudang</th>
                          <th className="py-3 px-4">Referensi & Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredMovements.map((mov, idx) => {
                          const isAddition = mov.type === 'IN';
                          const isReduction = mov.type === 'OUT';
                          return (
                            <tr
                              key={mov.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-bold text-slate-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-bold text-slate-900">
                                  {formatDateId(mov.date)}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {mov.date}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isAddition ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    + Penambahan Barang
                                  </span>
                                ) : isReduction ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    - Pengurangan Barang
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                    = Koreksi Opname
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">{mov.productName}</div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  SKU: {mov.sku}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                                <span
                                  className={
                                    isAddition
                                      ? 'text-emerald-700'
                                      : isReduction
                                      ? 'text-amber-700'
                                      : 'text-sky-700'
                                  }
                                >
                                  {isAddition ? '+' : isReduction ? '-' : '='}
                                  {mov.quantity} {mov.unit}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono tabular-nums whitespace-nowrap text-slate-600">
                                <span>
                                  {mov.previousStock} {mov.unit}
                                </span>
                                <span className="mx-1.5 text-slate-400">→</span>
                                <span className="font-bold text-slate-900">
                                  {mov.newStock} {mov.unit}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-mono text-[11px] font-semibold text-slate-700">
                                  {mov.reference}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {mov.notes || '-'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =======================================================
              MENU 6: PENGATURAN PERUSAHAAN, REKENING, WA & PASSWORD
          ======================================================= */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSaveSettings}
                className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-2xs"
              >
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Pengaturan Identitas Perusahaan, Rekening & Kontak
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data di bawah ini akan otomatis tercantum pada cetakan PDF Invoice dan pesan WhatsApp AI Anda.
                  </p>
                </div>

                {/* Bagian 1: Profil & Alamat */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#0284C7]">
                    1. Identitas & Alamat Perusahaan Supplier
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Perusahaan / Usaha Saya *
                      </label>
                      <input
                        type="text"
                        required
                        value={supplier.companyName}
                        onChange={(e) => setSupplier({ ...supplier, companyName: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Keterangan Singkat / Slogan Usaha
                      </label>
                      <input
                        type="text"
                        value={supplier.tagline}
                        onChange={(e) => setSupplier({ ...supplier, tagline: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat Lengkap Perusahaan / Gudang *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={supplier.address}
                        onChange={(e) => setSupplier({ ...supplier, address: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 2: Nomor Telepon WhatsApp, Email & Sosial Media */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-[#0284C7]">
                    2. Nomor Telepon WhatsApp, Email & Sosial Media
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor Telepon / WhatsApp *
                      </label>
                      <input
                        type="text"
                        required
                        value={supplier.phone}
                        onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })}
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat Email Usaha
                      </label>
                      <input
                        type="text"
                        value={supplier.email}
                        onChange={(e) => setSupplier({ ...supplier, email: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sosial Media (IG / FB / NPWP)
                      </label>
                      <input
                        type="text"
                        value={supplier.socialMedia}
                        onChange={(e) => setSupplier({ ...supplier, socialMedia: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 3: Nomor Rekening Bank Pembayaran Invoice */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-[#0284C7]">
                    3. Rekening Bank untuk Pembayaran Invoice
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Bank *
                      </label>
                      <input
                        type="text"
                        required
                        value={supplier.bankName}
                        onChange={(e) => setSupplier({ ...supplier, bankName: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor Rekening *
                      </label>
                      <input
                        type="text"
                        required
                        value={supplier.bankAccountNumber}
                        onChange={(e) =>
                          setSupplier({ ...supplier, bankAccountNumber: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Atas Nama Rekening *
                      </label>
                      <input
                        type="text"
                        required
                        value={supplier.bankAccountName}
                        onChange={(e) =>
                          setSupplier({ ...supplier, bankAccountName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 4: Penandatangan Nota */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-[#0284C7]">
                    4. Nama Pengirim untuk Pesan WhatsApp & Surat Jalan
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Lengkap Anda
                      </label>
                      <input
                        type="text"
                        value={supplier.signeeName}
                        onChange={(e) => setSupplier({ ...supplier, signeeName: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jabatan
                      </label>
                      <input
                        type="text"
                        value={supplier.signeeRole}
                        onChange={(e) => setSupplier({ ...supplier, signeeRole: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 5: Pengaturan Password Keamanan */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-[#0284C7] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>5. Password Keamanan (Menu Laba & Cetak Invoice)</span>
                  </div>
                  {isProfitUnlocked ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password Keamanan Anda *
                      </label>
                      <input
                        type="text"
                        required
                        value={supplier.accessPassword || '1234'}
                        onChange={(e) =>
                          setSupplier({ ...supplier, accessPassword: e.target.value })
                        }
                        className="w-full sm:w-64 px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-600">
                        Buka kunci password terlebih dahulu untuk mengubah password keamanan.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRequestUnlockProfit()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Buka Kunci Password</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {settingsSaved ? 'Pengaturan Berhasil Disimpan!' : 'Simpan Pengaturan Saya'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Pratinjau Langsung pada Invoice */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-2xs">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Pratinjau Tampilan di Cetakan Invoice
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tampilan kop tengah dan kotak Informasi Pembayaran sesuai format cetakan Anda:
                  </p>
                </div>

                <div className="p-5 bg-white border border-slate-300 rounded-lg text-center space-y-1 text-slate-900">
                  <div className="text-sm font-bold uppercase tracking-wide mb-2">INVOICE</div>
                  <div className="text-xs font-medium">{supplier.companyName}</div>
                  <div className="text-xs text-slate-700">{supplier.address}</div>
                  <div className="text-xs text-slate-700">
                    {[supplier.email, supplier.phone].filter((v) => v && v !== '-').join(' · ')}
                  </div>
                  {supplier.socialMedia && (
                    <div className="text-xs text-slate-700">{supplier.socialMedia}</div>
                  )}
                </div>

                <div className="border border-slate-800 p-4 text-xs space-y-1.5 text-slate-900 bg-white">
                  <div className="font-bold text-slate-950">Informasi Pembayaran</div>
                  <div>
                    {supplier.bankName} · No Rekening {supplier.bankAccountNumber} · a.n{' '}
                    {supplier.bankAccountName}
                  </div>
                  <div>
                    Mohon melakukan konfirmasi pembayaran beserta bukti transfer melalui nomor WhatsApp yang tercantum ({supplier.phone}).
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        products={products}
        clients={clients}
        invoices={invoices}
        editingInvoice={editingInvoice}
        isProfitUnlocked={isProfitUnlocked}
        onRequestUnlockProfit={() => handleRequestUnlockProfit()}
        onCreateInvoice={handleCreateInvoice}
        onUpdateInvoice={handleUpdateInvoice}
      />

      <InvoicePreviewModal
        invoice={previewInvoice}
        supplier={supplier}
        language="id"
        onLanguageChange={() => {}}
        isProfitUnlocked={isProfitUnlocked}
        onRequestUnlockProfit={() => handleRequestUnlockProfit()}
        onRequestPrintPassword={handleRequestPrintPassword}
        onClose={() => setPreviewInvoice(null)}
        onMarkPaid={handleMarkInvoicePaid}
        onOpenDPModal={handleOpenDPModal}
        onCancelInvoice={handleCancelInvoice}
        onUpdateInvoice={handleUpdateInvoice}
        onOpenWhatsAppAI={(inv) => {
          setPreviewInvoice(null);
          setWhatsAppModalInvoice(inv);
        }}
      />

      {/* Modal Pembayaran DP */}
      {dpModalInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Catat Pembayaran DP (Uang Muka)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dpModalInvoice.invoiceNumber} — {dpModalInvoice.villaName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDpModalInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDPPayment} className="p-5 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Tagihan Invoice:</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatRupiah(dpModalInvoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sisa Tagihan Setelah DP Ini:</span>
                  <span className="font-mono tabular-nums font-bold text-amber-800">
                    {formatRupiah(
                      Math.max(0, dpModalInvoice.totalAmount - Math.max(0, dpInputAmount))
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Total DP / Nominal yang Telah Dibayar (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  max={dpModalInvoice.totalAmount}
                  step={5000}
                  required
                  value={dpInputAmount}
                  onChange={(e) =>
                    setDpInputAmount(
                      Math.min(dpModalInvoice.totalAmount, Math.max(0, Number(e.target.value)))
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDpInputAmount(Math.round(dpModalInvoice.totalAmount * 0.3))
                    }
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-300 rounded-md whitespace-nowrap shrink-0"
                  >
                    DP 30%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDpInputAmount(Math.round(dpModalInvoice.totalAmount * 0.5))
                    }
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-300 rounded-md whitespace-nowrap shrink-0"
                  >
                    DP 50%
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDpInputAmount(Math.round(dpModalInvoice.totalAmount * 0.7))
                    }
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-300 rounded-md whitespace-nowrap shrink-0"
                  >
                    DP 70%
                  </button>
                  <button
                    type="button"
                    onClick={() => setDpInputAmount(dpModalInvoice.totalAmount)}
                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md whitespace-nowrap shrink-0"
                  >
                    Lunasi 100%
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDpModalInvoice(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pembayaran DP</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Modal HPP (Khusus dari Menu Laba & Keuntungan) */}
      {hppModalInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Rincian & Penyesuaian Modal HPP ({hppModalInvoice.invoiceNumber})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hppModalInvoice.villaName} · Ubah harga modal beli per unit untuk menghitung ulang laba nota ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHppModalInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHPPModal} className="p-5 space-y-4">
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <th className="py-2.5 px-3">Nama Barang</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Harga Jual</th>
                      <th className="py-2.5 px-3 text-right">Modal HPP / Unit</th>
                      <th className="py-2.5 px-3 text-right">Untung Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hppModalInvoice.items.map((item, idx) => {
                      const itemProfit =
                        item.subtotal - item.quantity * item.costPriceAtSale;
                      return (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{item.name}</td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatRupiah(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={item.costPriceAtSale}
                              onChange={(e) => {
                                const nextCost = Math.max(0, Number(e.target.value));
                                setHppModalInvoice((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        items: prev.items.map((it, i) =>
                                          i === idx ? { ...it, costPriceAtSale: nextCost } : it
                                        ),
                                      }
                                    : null
                                );
                              }}
                              className="w-28 px-2.5 py-1 text-right font-mono tabular-nums border border-slate-300 rounded-md"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                            +{formatRupiah(itemProfit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setHppModalInvoice(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Modal HPP & Laba</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AIWhatsAppSenderModal
        invoice={whatsAppModalInvoice}
        invoices={invoices}
        clients={clients}
        supplier={supplier}
        language={docLanguage}
        onLanguageChange={setDocLanguage}
        onClose={() => setWhatsAppModalInvoice(null)}
        onOpenPrintPreview={(inv) =>
          handleRequestPrintPassword(() => setPreviewInvoice(inv))
        }
        onRequestPrintPassword={handleRequestPrintPassword}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editingProduct={editingProduct}
        onSaveProduct={handleSaveProduct}
      />

      <RestockModal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        product={restockTargetProduct}
        products={products}
        onConfirmMovement={handleConfirmStockMovement}
      />

      <PasswordModal
        isOpen={passwordPrompt.isOpen}
        title={passwordPrompt.title}
        description={passwordPrompt.description}
        expectedPassword={supplier.accessPassword || '1234'}
        onClose={() => setPasswordPrompt((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={passwordPrompt.onSuccess}
      />

      {/* Modal Tambah Pelanggan Villa / Hotel Baru */}
      {isAddVillaModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Tambah Pelanggan Villa / Hotel Baru
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pelanggan yang ditambahkan akan otomatis muncul di daftar Invoice, AI WhatsApp, dan Peringkat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVillaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewVillaClient} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Villa / Hotel / Resort *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Villa Kayu Raja Seminyak"
                  value={newVillaForm.name}
                  onChange={(e) => setNewVillaForm({ ...newVillaForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Area / Kawasan (Bali)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Canggu / Ubud / Seminyak"
                    value={newVillaForm.area}
                    onChange={(e) => setNewVillaForm({ ...newVillaForm, area: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nama PIC / Kontak
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bli Kadek / Purchasing"
                    value={newVillaForm.contactPerson}
                    onChange={(e) =>
                      setNewVillaForm({ ...newVillaForm, contactPerson: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nomor WhatsApp Villa / PIC
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={newVillaForm.phone}
                    onChange={(e) => setNewVillaForm({ ...newVillaForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Alamat Pengiriman
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jl. Petitenget No. 18"
                    value={newVillaForm.address}
                    onChange={(e) => setNewVillaForm({ ...newVillaForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddVillaModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg whitespace-nowrap shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pelanggan Villa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
