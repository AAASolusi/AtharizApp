import React, { useState, useEffect, useRef } from "react";
import { User, Customer, Jobcard, UserRole, MachineItem } from "../types";
import { Logo } from "./Logo";
import { SignaturePad } from "./SignaturePad";
import { PDFPreviewModal } from "./PDFPreviewModal";
import { 
  getCustomers, saveCustomer, deleteCustomer, deleteCustomers,
  getUsers, saveUser, deleteUser,
  getJobcards, saveJobcard, deleteJobcard,
  isFirebaseActive
} from "../lib/db";
import {
  signInWithGoogleSheets,
  signOutGoogleSheets,
  registerSheetsAuthListener,
  createJobcardSpreadsheet,
  updateSpreadsheetData,
  getSheetsAccessToken
} from "../lib/googleSheets";
import { 
  Users, 
  Building2, 
  FileSpreadsheet, 
  CheckSquare, 
  Trash2, 
  Plus, 
  UserPlus, 
  Edit, 
  FileText, 
  DollarSign, 
  ClipboardList, 
  Upload, 
  Eye, 
  EyeOff,
  Check, 
  Search, 
  Lock, 
  LogOut, 
  HelpCircle,
  AlertCircle,
  X,
  Wrench
} from "lucide-react";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

type TabType = "jobs" | "customers" | "users" | "invoices" | "sheets";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem(`atn_admin_active_tab_${user.id}`) as TabType) || "jobs";
  });

  // Google Sheets Integration State
  const [sheetsUser, setSheetsUser] = useState<any | null>(null);
  const [sheetsToken, setSheetsToken] = useState<string | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsSuccessId, setSheetsSuccessId] = useState<string | null>(null);
  const [sheetTitle, setSheetTitle] = useState("Laporan PM CV Athariz Technology");
  const [destType, setDestType] = useState<"new" | "existing">("new");
  const [existingSheetId, setExistingSheetId] = useState("");
  const [sheetsStep, setSheetsStep] = useState<string | null>(null);

  // State Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobcards, setJobcards] = useState<Jobcard[]>([]);

  // Search & Filter
  const [searchCust, setSearchCust] = useState("");
  const [searchJob, setSearchJob] = useState("");
  const [searchUser, setSearchUser] = useState("");

  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  // Customer Bulk Selection State
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>([]);

  // Modals / Form Triggers
  const [customerModal, setCustomerModal] = useState<{ open: boolean; data?: Customer | null }>({ open: false });
  const [userModal, setUserModal] = useState<{ open: boolean; data?: User | null }>({ open: false });
  const [jobModal, setJobModal] = useState({ open: false });

  // Input states for Customer Form
  const [custWilayah, setCustWilayah] = useState("");
  const [custOutlet, setCustOutlet] = useState("");
  const [custAlamat, setCustAlamat] = useState("");

  // Input states for User Form
  const [userFullName, setUserFullName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>(UserRole.TECHNICIAN);
  const [userPhone, setUserPhone] = useState("");
  const [userOutletLink, setUserOutletLink] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);

  // Input states for Creating Jobcard
  const [selectedCustId, setSelectedCustId] = useState("");
  const [selectedTechId, setSelectedTechId] = useState("");
  const [jobMachines, setJobMachines] = useState<Omit<MachineItem, "id">[]>([
    { mesin: "Glory", type: "Usf 52", serialNumber: "", keterangan: "Preventive maintenance" }
  ]);

  // Invoice pricing workflow states
  const [selectedInvoiceJob, setSelectedInvoiceJob] = useState<Jobcard | null>(null);
  const [invoicePrices, setInvoicePrices] = useState<{ [machineId: string]: number }>({});
  const [invoiceAdminSign, setInvoiceAdminSign] = useState("");
  const [invoiceAdminName, setInvoiceAdminName] = useState("Agung Setiawan");

  // File CSV Input Ref
  const csvFileRef = useRef<HTMLInputElement | null>(null);

  // CSV Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "failed">("idle");
  const [importMessage, setImportMessage] = useState("");

  // PDF Preview State
  const [pdfPreview, setPdfPreview] = useState<{ jobcard: Jobcard; type: "lampiran" | "invoice" } | null>(null);

  useEffect(() => {
    fetchData();
    const unsubscribe = registerSheetsAuthListener((u, token) => {
      setSheetsUser(u);
      setSheetsToken(token);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(`atn_admin_active_tab_${user.id}`, activeTab);
  }, [activeTab, user.id]);

  const handleConnectSheets = async () => {
    setSheetsError(null);
    try {
      await signInWithGoogleSheets();
    } catch (err: any) {
      setSheetsError(err?.message || "Gagal menghubungkan ke Google Sheets");
    }
  };

  const handleDisconnectSheets = async () => {
    setSheetsError(null);
    setSheetsSuccessId(null);
    try {
      await signOutGoogleSheets();
    } catch (err: any) {
      setSheetsError(err?.message || "Gagal memutuskan koneksi");
    }
  };

  const handleSyncSheets = async () => {
    if (destType === "existing" && !existingSheetId.trim()) {
      setSheetsError("Silakan masukkan ID Spreadsheet yang valid.");
      return;
    }

    const confirmMsg = destType === "new"
      ? `Apakah Anda yakin ingin membuat Google Spreadsheet baru "${sheetTitle}" dan mengekspor seluruh data jobcard ke sana?`
      : `Apakah Anda yakin ingin mengekspor seluruh data jobcard ke Google Spreadsheet dengan ID: ${existingSheetId}? Data lama pada Sheet1 akan diperbarui.`;
      
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccessId(null);
    
    try {
      let spreadsheetId = "";
      if (destType === "new") {
        setSheetsStep("Membuat spreadsheet baru di Google Drive Anda...");
        spreadsheetId = await createJobcardSpreadsheet(sheetTitle);
      } else {
        spreadsheetId = existingSheetId.trim();
      }

      setSheetsStep("Memformat dan mengekspor seluruh data jobcard...");
      await updateSpreadsheetData(spreadsheetId, jobcards);
      
      setSheetsSuccessId(spreadsheetId);
      setSheetsStep(null);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err?.message || "Gagal menyelaraskan data dengan Google Sheets. Silakan coba login kembali.");
      setSheetsStep(null);
    } finally {
      setSheetsLoading(false);
    }
  };

  const fetchData = async () => {
    const cList = await getCustomers();
    const uList = await getUsers();
    const jList = await getJobcards();
    setCustomers(cList);
    setUsers(uList);
    setJobcards(jList);
  };

  // --- Customer CRUD ---
  const handleOpenCustomer = (c?: Customer) => {
    if (c) {
      setCustomerModal({ open: true, data: c });
      setCustWilayah(c.wilayah);
      setCustOutlet(c.outlet);
      setCustAlamat(c.alamat);
    } else {
      setCustomerModal({ open: true, data: null });
      setCustWilayah("BOGOR");
      setCustOutlet("");
      setCustAlamat("");
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custWilayah || !custOutlet || !custAlamat) return;

    const normalizedWilayah = custWilayah.trim().toLowerCase();
    const normalizedOutlet = custOutlet.trim().toLowerCase();

    // Check if another customer already has this combination
    const isDuplicate = customers.some(
      (c) =>
        c.id !== (customerModal.data?.id || "") &&
        c.wilayah.trim().toLowerCase() === normalizedWilayah &&
        c.outlet.trim().toLowerCase() === normalizedOutlet
    );

    if (isDuplicate) {
      alert("Error: Customer dengan kombinasi Wilayah dan Outlet tersebut sudah ada!");
      return;
    }

    const id = customerModal.data ? customerModal.data.id : "c-" + Date.now();
    const saved: Customer = {
      id,
      wilayah: custWilayah.trim(),
      outlet: custOutlet.trim(),
      alamat: custAlamat.trim()
    };

    await saveCustomer(saved);
    setCustomerModal({ open: false });
    fetchData();
  };

  const handleSingleDeleteCustomer = async (id: string, name: string) => {
    setConfirmationModal({
      open: true,
      title: "Hapus Customer",
      message: `Apakah Anda yakin ingin menghapus Customer: ${name}?`,
      onConfirm: async () => {
        await deleteCustomer(id);
        setSelectedCustIds(selectedCustIds.filter((x) => x !== id));
        fetchData();
        setConfirmationModal(null);
      }
    });
  };

  const handleBulkDeleteCustomers = async () => {
    if (selectedCustIds.length === 0) return;
    setConfirmationModal({
      open: true,
      title: "Hapus Customer",
      message: `Apakah Anda yakin ingin menghapus ${selectedCustIds.length} customer terpilih sekaligus?`,
      onConfirm: async () => {
        await deleteCustomers(selectedCustIds);
        setSelectedCustIds([]);
        fetchData();
        setConfirmationModal(null);
      }
    });
  };

  const toggleSelectCustomer = (id: string) => {
    if (selectedCustIds.includes(id)) {
      setSelectedCustIds(selectedCustIds.filter((x) => x !== id));
    } else {
      setSelectedCustIds([...selectedCustIds, id]);
    }
  };

  const toggleSelectAllCustomers = () => {
    const filteredIds = filteredCustomers.map((c) => c.id);
    const allSelected = filteredIds.every((id) => selectedCustIds.includes(id));
    if (allSelected) {
      // Unselect all in active view
      setSelectedCustIds(selectedCustIds.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all in active view
      const combined = Array.from(new Set([...selectedCustIds, ...filteredIds]));
      setSelectedCustIds(combined);
    }
  };

  // --- User CRUD ---
  const handleOpenUser = (u?: User) => {
    setShowUserPassword(false);
    if (u) {
      if (u.role === UserRole.SUPER_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
        alert("Akses Ditolak: Hanya Super Admin yang dapat melihat atau mengedit akun Super Admin!");
        return;
      }
      setUserModal({ open: true, data: u });
      setUserFullName(u.fullName);
      setUserUsername(u.username);
      setUserPassword(u.passwordHash);
      setUserRole(u.role);
      setUserPhone(u.phone || "");
      setUserOutletLink(u.customerOutlet || "");
    } else {
      setUserModal({ open: true, data: null });
      setUserFullName("");
      setUserUsername("");
      setUserPassword("");
      setUserRole(UserRole.TECHNICIAN);
      setUserPhone("");
      setUserOutletLink("");
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userFullName.trim() || !userUsername.trim()) {
      alert("Nama lengkap dan username wajib diisi!");
      return;
    }

    const normalizedUsername = userUsername.trim().toLowerCase();

    // If creating a new user, check for duplicate username
    if (!userModal.data) {
      const usernameExists = users.some((u) => u.username.toLowerCase() === normalizedUsername);
      if (usernameExists) {
        alert("Username ini sudah digunakan oleh pengguna lain!");
        return;
      }
    }

    if (userRole === UserRole.CUSTOMER && !userOutletLink) {
      alert("Harap pilih outlet customer yang ditautkan!");
      return;
    }

    if (userRole === UserRole.TECHNICIAN && !userPhone.trim()) {
      alert("Harap isi nomor telepon teknisi!");
      return;
    }

    const id = userModal.data ? userModal.data.id : "user-" + Date.now();
    
    let finalPwd = userPassword;
    let isDefault = userModal.data ? userModal.data.isDefaultPassword : false;
    
    if (!userModal.data) {
      // New User
      if (!userPassword) {
        finalPwd = userUsername;
        isDefault = true;
      } else {
        isDefault = false;
      }
    } else {
      // Editing existing user
      if (!userPassword) {
        finalPwd = userModal.data.passwordHash;
      } else {
        isDefault = false;
      }
    }

    const saved: User = {
      id,
      username: normalizedUsername,
      fullName: userFullName.trim(),
      passwordHash: finalPwd.trim(),
      role: userRole,
      phone: userRole === UserRole.TECHNICIAN && userPhone ? userPhone.trim() : undefined,
      customerOutlet: userRole === UserRole.CUSTOMER ? userOutletLink : undefined,
      isDefaultPassword: isDefault
    };

    try {
      await saveUser(saved);
      setUserModal({ open: false });
      fetchData();
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Gagal menyimpan data pengguna. Silakan coba lagi.");
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.role === UserRole.SUPER_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      alert("Akses Ditolak: Hanya Super Admin yang dapat menghapus akun Super Admin!");
      return;
    }
    setConfirmationModal({
      open: true,
      title: "Hapus User",
      message: `Apakah Anda yakin ingin menghapus User: ${targetUser.fullName}?`,
      onConfirm: async () => {
        await deleteUser(targetUser.id);
        fetchData();
        setConfirmationModal(null);
      }
    });
  };

  // --- CSV Import ---
  const handleCsvImportClick = () => {
    csvFileRef.current?.click();
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("idle");
    setImportMessage("Membaca file CSV...");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          throw new Error("File CSV kosong atau tidak terbaca.");
        }

        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          throw new Error("File CSV tidak memiliki data (hanya header atau kosong).");
        }

        const dataLines = lines.slice(1);
        let count = 0;
        let skipped = 0;

        // Fetch current active customers for synchronization check
        const currentCustomers = await getCustomers();
        const existingKeys = new Set(
          currentCustomers.map((c) => `${(c.wilayah || "").trim().toLowerCase()}|${(c.outlet || "").trim().toLowerCase()}`)
        );

        for (let i = 0; i < dataLines.length; i++) {
          const line = dataLines[i];
          
          // Basic CSV Parsing accounting for possible commas in quotes
          let parts: string[] = [];
          let insideQuotes = false;
          let currentPart = "";
          
          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === "," && !insideQuotes) {
              parts.push(currentPart.trim());
              currentPart = "";
            } else {
              currentPart += char;
            }
          }
          parts.push(currentPart.trim());

          if (parts.length >= 3) {
            const wilayah = parts[0].replace(/^"|"$/g, "").trim();
            const outlet = parts[1].replace(/^"|"$/g, "").trim();
            const alamat = parts[2].replace(/^"|"$/g, "").trim();

            const key = `${wilayah.toLowerCase()}|${outlet.toLowerCase()}`;

            if (existingKeys.has(key)) {
              skipped++;
            } else {
              const newCust: Customer = {
                id: `c-csv-${Date.now()}-${i}`,
                wilayah,
                outlet,
                alamat
              };
              await saveCustomer(newCust);
              existingKeys.add(key);
              count++;
            }
          }

          // Calculate progress percentage
          const progress = Math.round(((i + 1) / dataLines.length) * 100);
          setImportProgress(progress);
          setImportMessage(`Sinkronisasi & Impor: ${i + 1} dari ${dataLines.length} baris...`);

          // Small delay to make the progress animation visible
          await new Promise((resolve) => setTimeout(resolve, Math.max(20, 500 / dataLines.length)));
        }

        setImportStatus("success");
        if (count === 0 && skipped > 0) {
          setImportMessage(`Selesai sinkronisasi. Seluruh data (${skipped}) sudah ada di database (tidak ada yang diimpor).`);
        } else if (skipped > 0) {
          setImportMessage(`Berhasil mengimpor ${count} customer baru! (${skipped} data duplikat dilewati).`);
        } else {
          setImportMessage(`Berhasil mengimpor ${count} data customer BNI dari file CSV!`);
        }
        fetchData();
      } catch (err: any) {
        console.error("Gagal mengimpor CSV:", err);
        setImportStatus("failed");
        setImportMessage(err?.message || "Gagal mengimpor file CSV. Pastikan format file sesuai.");
      } finally {
        setIsImporting(false);
        // Reset file input
        if (csvFileRef.current) csvFileRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setImportStatus("failed");
      setImportMessage("Gagal membaca file dari penyimpanan.");
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  // --- Create & Assign Jobcard Form Helpers ---
  const addMachineRow = () => {
    setJobMachines([
      ...jobMachines,
      { mesin: "Glory", type: "Usf 52", serialNumber: "", keterangan: "Preventive maintenance" }
    ]);
  };

  const updateMachineRow = (index: number, field: keyof Omit<MachineItem, "id">, val: string) => {
    const copy = [...jobMachines];
    copy[index] = { ...copy[index], [field]: val };
    setJobMachines(copy);
  };

  const deleteMachineRow = (index: number) => {
    if (jobMachines.length <= 1) return;
    setJobMachines(jobMachines.filter((_, i) => i !== index));
  };

  const handleCreateAndAssignJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId || !selectedTechId) {
      alert("Harap pilih Customer Outlet dan Teknisi pelaksana!");
      return;
    }

    const c = customers.find((cust) => cust.id === selectedCustId);
    const t = users.find((u) => u.id === selectedTechId);

    if (!c || !t) return;

    // Verify all serial numbers are entered
    const hasEmptySerial = jobMachines.some((m) => !m.serialNumber.trim());
    if (hasEmptySerial) {
      alert("Harap isi semua Nomor Seri mesin pengerjaan!");
      return;
    }

    const newJob: Jobcard = {
      id: "job-" + Date.now(),
      noJobcard: String(Math.floor(10000000 + Math.random() * 90000000)), // dynamic 8 digit card num
      customerName: c.outlet,
      customerAddress: c.alamat,
      tglPengerjaan: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD
      teknisiId: t.id,
      teknisiName: t.fullName || t.username,
      teknisiPhone: t.phone || "+6281574757617",
      status: "Pending",
      photos: [],
      machines: jobMachines.map((m, idx) => ({ ...m, id: `m-new-${idx}-${Date.now()}` }))
    };

    await saveJobcard(newJob);
    setJobModal({ open: false });
    
    // Reset states
    setSelectedCustId("");
    setSelectedTechId("");
    setJobMachines([{ mesin: "Glory", type: "Usf 52", serialNumber: "", keterangan: "Preventive maintenance" }]);
    
    fetchData();
    alert("Berhasil membuat penugasan PM harian! Teknisi otomatis menerima tugas.");
  };

  // --- Invoice Pricer Form Helpers ---
  const handleOpenInvoicing = (job: Jobcard) => {
    setSelectedInvoiceJob(job);
    const initialPrices: { [key: string]: number } = {};
    job.machines.forEach((m) => {
      initialPrices[m.id] = m.harga || 0;
    });
    setInvoicePrices(initialPrices);
    setInvoiceAdminSign(job.adminSignatureBase64 || "");
    setInvoiceAdminName(job.adminSignatureName || "Agung Setiawan");
  };

  const handleSaveInvoiceDetails = async () => {
    if (!selectedInvoiceJob) return;

    if (!invoiceAdminSign) {
      alert("Tanda tangan digital CV wajib dibubuhkan sebelum mengekspor Invoice!");
      return;
    }

    // Update prices inside machines
    const updatedMachines = selectedInvoiceJob.machines.map((m) => ({
      ...m,
      harga: Number(invoicePrices[m.id]) || 0
    }));

    const total = updatedMachines.reduce((s, m) => s + (m.harga || 0), 0);

    const updatedJob: Jobcard = {
      ...selectedInvoiceJob,
      machines: updatedMachines,
      invoiceNo: `INV-${selectedInvoiceJob.noJobcard}`,
      invoiceTotal: total,
      invoiceDate: new Date().toLocaleString("id-ID", { month: "long", year: "numeric" }), // e.g., "Juli 2026"
      invoiceStatus: "Draft",
      adminSignatureBase64: invoiceAdminSign,
      adminSignatureName: invoiceAdminName
    };

    await saveJobcard(updatedJob);
    
    // Refresh lists and open PDF Preview immediately
    fetchData();
    setSelectedInvoiceJob(null);
    setPdfPreview({ jobcard: updatedJob, type: "invoice" });
  };

  // Filter lists based on Search strings
  const filteredCustomers = customers.filter(
    (c) =>
      c.outlet.toLowerCase().includes(searchCust.toLowerCase()) ||
      c.wilayah.toLowerCase().includes(searchCust.toLowerCase()) ||
      c.alamat.toLowerCase().includes(searchCust.toLowerCase())
  );

  const filteredJobcards = jobcards.filter(
    (j) =>
      j.customerName.toLowerCase().includes(searchJob.toLowerCase()) ||
      j.teknisiName.toLowerCase().includes(searchJob.toLowerCase()) ||
      j.noJobcard.includes(searchJob)
  );

  // Stats Calculations for Dashboard Summary Card Section
  const activeJobcardsCount = jobcards.filter((j) => j.status === "Pending").length;
  const pendingTasksCount = jobcards
    .filter((j) => j.status === "Pending")
    .reduce((acc, j) => acc + (j.machines?.length || 0), 0);
  const totalTechnicians = users.filter((u) => u.role === UserRole.TECHNICIAN).length;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      
      {/* Desktop Top Nav Header - Geometric Balance Style */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="ATN Logo"
            className="w-10 h-10 object-contain rounded"
            referrerPolicy="no-referrer"
          />
          <div className="text-left min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight leading-none uppercase truncate sm:whitespace-normal">ATHARIZ TECHNOLOGY NOESANTARA</h1>
            <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest leading-none mt-1.5 font-semibold truncate">Maintenance Jobcard Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-900">Admin: {user.fullName}</p>
            <p className={`text-[10px] ${isFirebaseActive ? "text-green-600" : "text-amber-500"} font-medium flex items-center justify-end uppercase`}>
              <span className={`w-1.5 h-1.5 ${isFirebaseActive ? "bg-green-500" : "bg-amber-500"} rounded-full mr-1.5`}></span>
              {isFirebaseActive ? "Database: Firebase (Aktif)" : "Database: Lokal (Offline)"}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-[#C52328] text-gray-700 hover:text-white rounded border border-gray-200 transition-colors text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#F9FAFB]">
        
        {/* Left Side Sidebar - Tabs Navigation (Geometric Balance style) */}
        <aside className="w-full md:w-60 bg-[#1A1A1A] text-gray-400 p-3 md:p-4 flex flex-row md:flex-col gap-2 shrink-0 border-b md:border-r border-gray-200 overflow-x-auto md:overflow-x-visible items-center md:items-stretch md:min-h-[calc(100vh-4rem)]">
          <div className="px-2 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-left hidden md:block">
            MAIN MENU
          </div>

          <button
            onClick={() => { setActiveTab("jobs"); setSelectedCustIds([]); }}
            className={`flex items-center gap-1.5 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors text-left shrink-0 ${
              activeTab === "jobs"
                ? "bg-[#C52328] text-white font-bold"
                : "hover:bg-white/5 hover:text-white text-gray-400"
            }`}
          >
            <ClipboardList className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="whitespace-nowrap">Dashboard Admin</span>
          </button>

          <button
            onClick={() => { setActiveTab("customers"); setSelectedCustIds([]); }}
            className={`flex items-center gap-1.5 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors text-left shrink-0 ${
              activeTab === "customers"
                ? "bg-[#C52328] text-white font-bold"
                : "hover:bg-white/5 hover:text-white text-gray-400"
            }`}
          >
            <Building2 className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="whitespace-nowrap">Data Customer</span>
          </button>

          <button
            onClick={() => { setActiveTab("users"); setSelectedCustIds([]); }}
            className={`flex items-center gap-1.5 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors text-left shrink-0 ${
              activeTab === "users"
                ? "bg-[#C52328] text-white font-bold"
                : "hover:bg-white/5 hover:text-white text-gray-400"
            }`}
          >
            <Users className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="whitespace-nowrap">User Management</span>
          </button>

          <button
            onClick={() => { setActiveTab("invoices"); setSelectedCustIds([]); }}
            className={`flex items-center gap-1.5 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors text-left shrink-0 ${
              activeTab === "invoices"
                ? "bg-[#C52328] text-white font-bold"
                : "hover:bg-white/5 hover:text-white text-gray-400"
            }`}
          >
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="whitespace-nowrap">Invoice Center</span>
          </button>

          <button
            onClick={() => { setActiveTab("sheets"); setSelectedCustIds([]); }}
            className={`flex items-center gap-1.5 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors text-left shrink-0 ${
              activeTab === "sheets"
                ? "bg-[#C52328] text-white font-bold"
                : "hover:bg-white/5 hover:text-white text-gray-400"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="whitespace-nowrap">Google Sheets Sync</span>
          </button>

          {/* Bottom Capacity Tracker - Exact match to theme HTML */}
          <div className="mt-auto pt-6 hidden md:block">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">System Capacity</p>
              <div className="w-full h-1 bg-white/10 rounded-full mt-2">
                <div className="w-3/4 h-full bg-[#C52328] rounded-full"></div>
              </div>
              <p className="text-[10px] mt-2 text-gray-400 font-mono">76.4 GB / 100 GB Cloud Storage</p>
            </div>
          </div>
        </aside>

        {/* Right Side Content Pane */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50 text-left relative">
          
          {/* Transparent Realistic Company Logo Background Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.035] transition-opacity duration-500">
            <div className="flex flex-col items-center justify-center transform scale-100 sm:scale-125 rotate-[-12deg] filter grayscale contrast-125">
              <img
                src="/logo.png"
                alt="Background Logo Watermark"
                className="w-80 h-80 sm:w-96 sm:h-96 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="mt-4 flex flex-col items-center text-center">
                <span className="text-xl sm:text-2xl font-black tracking-[0.25em] text-gray-950 uppercase leading-none">
                  CV. ATHARIZ TECHNOLOGY
                </span>
                <span className="text-sm sm:text-base font-extrabold tracking-[0.45em] text-gray-900 uppercase font-mono leading-none mt-2">
                  N O E S A N T A R A
                </span>
              </div>
            </div>
          </div>
          
          {/* Executive Summary Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Card 1: Active Jobcards */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Jobcards</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{activeJobcardsCount}</span>
                  <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded uppercase">Pending</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Tugas PM lapangan aktif</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                <ClipboardList className="w-6 h-6 text-[#C52328]" />
              </div>
            </div>

            {/* Card 2: Pending Maintenance Tasks */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Tasks</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{pendingTasksCount}</span>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded uppercase">In Progress</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Mesin dalam antrean servis</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Wrench className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            {/* Card 3: Total Technicians */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered Technicians</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{totalTechnicians}</span>
                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded uppercase">Active</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Teknisi tersertifikasi lapangan</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          {/* TAB 1: JOBCARDS MONITORING & ASSIGNMENT */}
          {activeTab === "jobs" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-red-600" /> Monitoring & Tugas PM Lapangan
                  </h2>
                  <p className="text-xs text-slate-500">Melihat status dan menugaskan pekerjaan PM harian</p>
                </div>
                <button
                  onClick={() => setJobModal({ open: true })}
                  className="bg-red-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-700/10 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Buat Tugas Baru
                </button>
              </div>

              {/* Search Job */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchJob}
                  onChange={(e) => setSearchJob(e.target.value)}
                  placeholder="Cari tugas berdasarkan nama outlet customer, nomor jobcard, teknisi..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Jobcards Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">No. Jobcard</th>
                      <th className="py-3 px-4">Customer Outlet</th>
                      <th className="py-3 px-4">Teknisi</th>
                      <th className="py-3 px-4">Tanggal PM</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredJobcards.map((j) => {
                      const isCompleted = j.status === "Completed";
                      return (
                        <tr key={j.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{j.noJobcard}</td>
                          <td className="py-3 px-4 font-extrabold text-slate-900">{j.customerName}</td>
                          <td className="py-3 px-4 text-slate-600 capitalize">{j.teknisiName}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono">{j.tglPengerjaan}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                              isCompleted 
                                ? "bg-green-50 text-green-700 border border-green-200" 
                                : "bg-red-50 text-red-600 border border-red-100"
                            }`}>
                              {j.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-2 justify-end">
                              {isCompleted ? (
                                <button
                                  onClick={() => setPdfPreview({ jobcard: j, type: "lampiran" })}
                                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 p-1.5 rounded transition-all font-bold flex items-center gap-1"
                                  title="Lihat Lampiran PDF"
                                >
                                  <FileText className="w-3.5 h-3.5" /> <span>Lampiran</span>
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Hapus Jobcard penugasan nomor ${j.noJobcard}?`)) {
                                      await deleteJobcard(j.id);
                                      fetchData();
                                    }
                                  }}
                                  className="text-red-500 hover:text-white p-1.5 hover:bg-red-500 rounded transition-all"
                                  title="Hapus Tugas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredJobcards.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          Tidak ditemukan tugas PM matching.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMERS MASTER DATA (With Checkbox, Select All, Bulk delete) */}
          {activeTab === "customers" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-red-600" /> Kelola Data Customer BNI
                  </h2>
                  <p className="text-xs text-slate-500">
                    Menampilkan total {customers.length} outlet terdaftar. Bulk select, CSV import, & Single-delete.
                  </p>
                </div>
                
                <div className="flex flex-col items-stretch sm:items-end gap-1.5">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCsvImportClick}
                      disabled={isImporting}
                      className={`bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all flex items-center gap-1.5 shadow-sm ${
                        isImporting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isImporting ? (
                        <span className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>Import CSV</span>
                    </button>
                    <input
                      ref={csvFileRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                      disabled={isImporting}
                    />
                    <button
                      onClick={() => handleOpenCustomer()}
                      disabled={isImporting}
                      className="bg-red-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Tambah Customer
                    </button>
                  </div>

                  {/* Keterangan progress dan status success / failed dibawah tombol */}
                  {(isImporting || importStatus !== "idle") && (
                    <div className="w-full sm:max-w-[240px] bg-white border border-slate-200 p-2.5 rounded-xl space-y-1.5 shadow-sm text-[11px] text-left">
                      {isImporting && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-slate-600 font-bold">
                            <span className="animate-pulse">Memproses file...</span>
                            <span className="font-mono">{importProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-150 ease-out"
                              style={{ width: `${importProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {importMessage && (
                        <p className={`font-semibold leading-normal break-words ${
                          importStatus === "success" 
                            ? "text-emerald-700" 
                            : importStatus === "failed" 
                            ? "text-red-600" 
                            : "text-slate-500"
                        }`}>
                          {importStatus === "success" && "✓ "}
                          {importStatus === "failed" && "✗ "}
                          {importMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar (Search + Bulk action) */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchCust}
                    onChange={(e) => setSearchCust(e.target.value)}
                    placeholder="Cari wilayah atau nama outlet BNI..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-slate-900"
                  />
                </div>

                {/* Bulk Action Button: Only visible if some are checked */}
                {selectedCustIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteCustomers}
                    className="bg-red-600 text-white px-3.5 py-2 rounded-xl font-extrabold text-xs hover:bg-red-700 transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-red-700/25 animate-pulse"
                  >
                    <Trash2 className="w-4 h-4" /> Hapus Terpilih ({selectedCustIds.length})
                  </button>
                )}
              </div>

              {/* Customers Master Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredCustomers.length > 0 &&
                            filteredCustomers.every((c) => selectedCustIds.includes(c.id))
                          }
                          onChange={toggleSelectAllCustomers}
                          className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 accent-red-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 w-28">WILAYAH</th>
                      <th className="py-3 px-4 w-44">OUTLET</th>
                      <th className="py-3 px-4">ALAMAT LENGKAP</th>
                      <th className="py-3 px-4 w-24 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredCustomers.map((c) => {
                      const isSelected = selectedCustIds.includes(c.id);
                      return (
                        <tr 
                          key={c.id} 
                          className={`transition-all ${
                            isSelected ? "bg-red-50/20 hover:bg-red-50/40" : "hover:bg-slate-50/50"
                          }`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCustomer(c.id)}
                              className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 accent-red-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded tracking-wide">
                              {c.wilayah}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-slate-900">{c.outlet}</td>
                          <td className="py-3 px-4 text-slate-600 leading-relaxed font-normal">{c.alamat}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-2.5 justify-end">
                              <button
                                onClick={() => handleOpenCustomer(c)}
                                className="text-slate-500 hover:text-red-600 p-1 rounded hover:bg-slate-100"
                                title="Edit Customer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSingleDeleteCustomer(c.id, c.outlet)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          Belum ada customer terdaftar atau hasil pencarian nihil.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT (Technicians, Clients CRUD) */}
          {activeTab === "users" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-600" /> Kelola Akun & Pengguna
                  </h2>
                  <p className="text-xs text-slate-500">Kelola kredensial akses untuk Admin, Teknisi, dan Customer</p>
                </div>
                <button
                  onClick={() => handleOpenUser()}
                  className="bg-red-600 text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-md flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> Tambah User
                </button>
              </div>

              {/* Search Users */}
              <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Cari user berdasarkan nama atau username..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Role / Hak Akses</th>
                      <th className="py-3 px-4">Kontak / Tautan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {users
                      .filter((u) => 
                        u.fullName.toLowerCase().includes(searchUser.toLowerCase()) || 
                        u.username.toLowerCase().includes(searchUser.toLowerCase())
                      )
                      .map((u) => {
                      const isSuperAdminRow = u.role === UserRole.SUPER_ADMIN;
                      const canManageRow = user.role === UserRole.SUPER_ADMIN || !isSuperAdminRow;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-3 px-4 font-extrabold text-slate-900 capitalize">{u.fullName}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">{u.username}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                              u.role === UserRole.SUPER_ADMIN
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : u.role === UserRole.ADMIN 
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : u.role === UserRole.TECHNICIAN
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-sky-50 text-sky-700 border-sky-100"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {u.role === UserRole.TECHNICIAN ? u.phone || "-" : u.customerOutlet || "-"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex gap-2 justify-end">
                              {canManageRow ? (
                                <>
                                  <button
                                    onClick={() => handleOpenUser(u)}
                                    className="text-slate-500 hover:text-red-600 p-1.5 rounded hover:bg-slate-100"
                                    title="Edit User"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  {u.id !== "user-admin" && u.id !== "user-superadmin" && (
                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded"
                                      title="Hapus User"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 bg-slate-100 px-2 py-1 rounded" title="Diperlukan hak akses Super Admin">
                                  <Lock className="w-3 h-3 text-slate-500" /> Terkunci
                                </span>
                              )}
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

          {/* TAB 4: PENAGIHAN & INVOICING */}
          {activeTab === "invoices" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" /> Administrasi Invoice Finansial
                </h2>
                <p className="text-xs text-slate-500">
                  Pilih pekerjaan PM yang telah selesai, masukkan harga per item, dan buat Invoice Resmi (PM BNI Ciomas-2.pdf).
                </p>
              </div>

              {/* Ringkasan Total Tagihan Keseluruhan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-700">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Total Tagihan Keseluruhan</p>
                    <p className="text-xl font-extrabold text-emerald-950 mt-0.5">
                      Rp, {jobcards
                        .filter((j) => j.status === "Completed")
                        .reduce((sum, j) => sum + (j.invoiceTotal || 0), 0)
                        .toLocaleString("id-ID")},-
                    </p>
                  </div>
                </div>

                <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
                  <div className="bg-sky-100 p-3 rounded-xl text-sky-700">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-sky-800 tracking-wider">Selesai Di-Invoice</p>
                    <p className="text-xl font-extrabold text-sky-950 mt-0.5">
                      {jobcards.filter((j) => j.status === "Completed" && (j.invoiceTotal || 0) > 0).length} Jobcard
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
                  <div className="bg-amber-100 p-3 rounded-xl text-amber-700">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-amber-800 tracking-wider font-sans">Belum Di-Invoice</p>
                    <p className="text-xl font-extrabold text-amber-950 mt-0.5">
                      {jobcards.filter((j) => j.status === "Completed" && !(j.invoiceTotal || 0)).length} Jobcard
                    </p>
                  </div>
                </div>
              </div>

              {/* Listing Completed Jobcards awaiting pricing or already priced */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">No. Jobcard</th>
                      <th className="py-3 px-4">Customer Outlet</th>
                      <th className="py-3 px-4">Tanggal Selesai</th>
                      <th className="py-3 px-4">Total Tagihan</th>
                      <th className="py-3 px-4">Status Invoice</th>
                      <th className="py-3 px-4 text-right">Aksi Penagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {jobcards
                      .filter((j) => j.status === "Completed")
                      .map((j) => {
                        const hasTotal = (j.invoiceTotal || 0) > 0;
                        return (
                          <tr key={j.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">{j.noJobcard}</td>
                            <td className="py-3 px-4 font-extrabold text-slate-900">{j.customerName}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {j.completedAt ? new Date(j.completedAt).toLocaleDateString("id-ID") : "-"}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {hasTotal ? `Rp, ${j.invoiceTotal?.toLocaleString()},-` : "Harap input harga"}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                                hasTotal 
                                  ? "bg-green-50 text-green-700 border-green-200" 
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}>
                                {hasTotal ? "INVOICED" : "BELUM DI-INVOICE"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleOpenInvoicing(j)}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded transition-all font-bold flex items-center gap-1"
                                  title="Proses Invoicing"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> <span>Input Harga</span>
                                </button>
                                {hasTotal && (
                                  <button
                                    onClick={() => setPdfPreview({ jobcard: j, type: "invoice" })}
                                    className="bg-sky-50 hover:bg-sky-100 text-sky-700 p-1.5 rounded transition-all font-bold flex items-center gap-1"
                                    title="Pratinjau & Cetak Invoice"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> <span>Invoice</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {jobcards.filter((j) => j.status === "Completed").length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          Belum ada tugas PM yang diselesaikan oleh teknisi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: GOOGLE SHEETS SYNCHRONIZATION */}
          {activeTab === "sheets" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-red-600" /> Sinkronisasi Google Sheets
                </h2>
                <p className="text-xs text-slate-500">
                  Hubungkan dengan akun Google Drive / Sheets Anda untuk mengekspor atau memperbarui laporan Maintenance Jobcard PM secara real-time.
                </p>
              </div>

              {/* Error Alert if any */}
              {sheetsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-700 font-semibold">
                    <p className="font-bold uppercase tracking-wide">Error Sinkronisasi</p>
                    <p className="mt-1 leading-relaxed">{sheetsError}</p>
                  </div>
                </div>
              )}

              {/* Connection Status Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Koneksi API</span>
                  {sheetsToken ? (
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                      <div>
                        <p className="text-xs font-bold text-slate-950">Terhubung ke Google Sheets</p>
                        {sheetsUser && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            {sheetsUser.displayName || "Google User"} ({sheetsUser.email})
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex w-2.5 h-2.5 bg-amber-500 rounded-full" />
                      <p className="text-xs font-bold text-slate-600">Belum Terhubung ke Google Sheets</p>
                    </div>
                  )}
                </div>

                <div>
                  {sheetsToken ? (
                    <button
                      onClick={handleDisconnectSheets}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors shadow-sm"
                    >
                      Putuskan Akun Google
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectSheets}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-extrabold text-slate-700 transition-colors shadow-sm cursor-pointer"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      Hubungkan Akun Google
                    </button>
                  )}
                </div>
              </div>

              {/* Synchronization Action & Settings Section */}
              {sheetsToken && (
                <div className="border border-slate-200 rounded-2xl p-5 space-y-5 text-left">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Pengaturan Ekspor & Sinkronisasi
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pilih jenis ekspor data jobcard yang Anda butuhkan ke layanan Google Sheets.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Destination Selection */}
                    <div className="flex flex-col sm:flex-row gap-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="destType"
                          value="new"
                          checked={destType === "new"}
                          onChange={() => { setDestType("new"); setSheetsSuccessId(null); }}
                          className="accent-red-600 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-800">Buat Spreadsheet Baru</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="destType"
                          value="existing"
                          checked={destType === "existing"}
                          onChange={() => { setDestType("existing"); setSheetsSuccessId(null); }}
                          className="accent-red-600 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-800">Perbarui Spreadsheet yang Sudah Ada</span>
                      </label>
                    </div>

                    {/* Conditional input fields */}
                    {destType === "new" ? (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Judul Spreadsheet Baru
                        </label>
                        <input
                          type="text"
                          value={sheetTitle}
                          onChange={(e) => setSheetTitle(e.target.value)}
                          placeholder="Masukkan judul laporan..."
                          className="w-full sm:w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Spreadsheet ID
                        </label>
                        <input
                          type="text"
                          value={existingSheetId}
                          onChange={(e) => setExistingSheetId(e.target.value)}
                          placeholder="Masukkan Google Spreadsheet ID..."
                          className="w-full sm:w-2/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-500 font-mono"
                        />
                        <p className="text-[10px] text-slate-400">
                          ID dapat diambil dari URL spreadsheet Anda (misal: https://docs.google.com/spreadsheets/d/<span className="font-bold text-slate-600">ID_TERTERA</span>/edit)
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t border-slate-100 pt-4">
                      <button
                        onClick={handleSyncSheets}
                        disabled={sheetsLoading}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-md ${
                          sheetsLoading
                            ? "bg-slate-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700 shadow-red-700/10"
                        }`}
                      >
                        {sheetsLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            <span>Menyinkronkan...</span>
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="w-4 h-4 shrink-0" />
                            <span>Ekspor & Sinkronisasi</span>
                          </>
                        )}
                      </button>

                      {sheetsStep && (
                        <p className="text-[11px] text-slate-500 font-medium animate-pulse">
                          ⏳ {sheetsStep}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Success Notification Panel with Spreadsheet direct URL */}
              {sheetsSuccessId && (
                <div className="p-5 bg-green-50 border border-green-200 rounded-2xl text-left space-y-3.5 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-700 shrink-0 mt-0.5 bg-green-100 rounded-full p-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide">
                        Laporan Berhasil Disinkronkan!
                      </h4>
                      <p className="text-xs text-green-700 mt-1 leading-relaxed">
                        Seluruh data jobcard preventif maintenance PM telah diekspor dan diformat dengan sempurna ke Google Sheets Anda.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${sheetsSuccessId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-green-900/10"
                    >
                      Buka Google Spreadsheet ↗
                    </a>
                    <button
                      onClick={() => setSheetsSuccessId(null)}
                      className="px-3.5 py-2 bg-white border border-green-200 hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Tutup Notifikasi
                    </button>
                  </div>
                </div>
              )}

              {/* Data Columns Information Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Kolom Data yang Diekspor
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format data spreadsheet terstruktur untuk mempermudah visualisasi dashboard, pivot, dan pelaporan manajemen internal CV. Athariz Technology:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    "No. Jobcard",
                    "Tanggal PM",
                    "Nama Customer",
                    "Alamat Outlet",
                    "Nama Teknisi",
                    "No. HP Teknisi",
                    "Status Pengerjaan",
                    "Waktu Selesai",
                    "No. Invoice",
                    "Tanggal Invoice",
                    "Total Invoice (IDR)",
                    "Status Tagihan",
                    "Jumlah Mesin",
                    "Detail Nama Mesin"
                  ].map((col, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/60 p-2 rounded-lg text-center">
                      <span className="text-[10px] font-semibold text-slate-600 font-mono">
                        {col}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- POPUP MODAL 1: CREATE JOBCARD & ASSIGN TO TECHNICIAN --- */}
      {jobModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Jadwalkan Tugas PM Baru</h3>
              <button onClick={() => setJobModal({ open: false })} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAndAssignJob} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-left">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Select Customer */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    1. Pilih Customer Outlet
                  </label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 outline-none text-slate-900 font-semibold"
                    required
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.wilayah}] - {c.outlet}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Technician */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    2. Tugaskan ke Teknisi
                  </label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500 outline-none text-slate-900 font-semibold"
                    required
                  >
                    <option value="">-- Pilih Teknisi pelaksana --</option>
                    {users
                      .filter((u) => u.role === UserRole.TECHNICIAN)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.phone || "-"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Selected Customer auto address preview */}
              {selectedCustId && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wide">Alamat Pengiriman Penugasan:</span>
                  <p className="text-slate-600 leading-relaxed font-semibold">
                    {customers.find(c => c.id === selectedCustId)?.alamat}
                  </p>
                </div>
              )}

              {/* Machine list builder */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Daftar Mesin yang Perlu di-PM
                  </span>
                  <button
                    type="button"
                    onClick={addMachineRow}
                    className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-100 transition-all flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Tambah Mesin
                  </button>
                </div>

                <div className="space-y-3">
                  {jobMachines.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="md:col-span-3">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Nama Mesin</label>
                        <select
                          value={m.mesin}
                          onChange={(e) => updateMachineRow(idx, "mesin", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-950 outline-none"
                        >
                          <option value="Glory">Glory</option>
                          <option value="Compuprint">Compuprint</option>
                          <option value="Epson">Epson</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Tipe</label>
                        <input
                          type="text"
                          value={m.type}
                          onChange={(e) => updateMachineRow(idx, "type", e.target.value)}
                          placeholder="e.g. Usf 52"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-950 outline-none"
                          required
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">No Seri</label>
                        <input
                          type="text"
                          value={m.serialNumber}
                          onChange={(e) => updateMachineRow(idx, "serialNumber", e.target.value)}
                          placeholder="e.g. 77998"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-950 outline-none"
                          required
                        />
                      </div>

                      <div className="md:col-span-3 flex items-end gap-1">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Keterangan</label>
                          <input
                            type="text"
                            value={m.keterangan}
                            onChange={(e) => updateMachineRow(idx, "keterangan", e.target.value)}
                            placeholder="e.g. Preventive maintenance"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-950 outline-none"
                          />
                        </div>
                        {jobMachines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteMachineRow(idx)}
                            className="bg-red-50 text-red-600 p-1 rounded hover:bg-red-100 transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setJobModal({ open: false })}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"
                >
                  Buat & Tugaskan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL 2: ADD / EDIT CUSTOMER --- */}
      {customerModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {customerModal.data ? "Edit Data BNI Outlet" : "Tambah BNI Outlet Baru"}
              </h3>
              <button onClick={() => setCustomerModal({ open: false })} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Wilayah BNI
                </label>
                <input
                  type="text"
                  value={custWilayah}
                  onChange={(e) => setCustWilayah(e.target.value)}
                  placeholder="e.g. BOGOR, BSD, CIBINONG, DEPOK MARGONDA, UNI DEPOK"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Outlet
                </label>
                <input
                  type="text"
                  value={custOutlet}
                  onChange={(e) => setCustOutlet(e.target.value)}
                  placeholder="e.g. BNI CIOMAS"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Alamat Lengkap Outlet
                </label>
                <textarea
                  value={custAlamat}
                  onChange={(e) => setCustAlamat(e.target.value)}
                  placeholder="Masukkan alamat lengkap outlet..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomerModal({ open: false })}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"
                >
                  Simpan Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL 3: ADD / EDIT USER ACCOUNT --- */}
      {userModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {userModal.data ? "Edit Akun Pengguna" : "Tambah Akun Pengguna"}
              </h3>
              <button onClick={() => setUserModal({ open: false })} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Pilih Hak Akses / Role
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none font-semibold"
                  disabled={!!userModal.data} // Immutable role on edit
                  required
                >
                  <option value={UserRole.TECHNICIAN}>Teknisi Lapangan</option>
                  <option value={UserRole.CUSTOMER}>Klien / Customer</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                  {user.role === UserRole.SUPER_ADMIN && (
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Lengkap Pengguna
                </label>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. wahyono"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Username Login
                </label>
                <input
                  type="text"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  placeholder="e.g. wahyono"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                  disabled={!!userModal.data} // Username immutable for safety
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Password Akun
                </label>
                <div className="relative">
                  <input
                    type={showUserPassword ? "text" : "password"}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={userModal.data ? "Masukkan password baru" : "Kosongkan untuk menyamakan dengan username (bawaan)"}
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Conditional Input field for Technician */}
              {userRole === UserRole.TECHNICIAN && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    No. Telepon / Hp
                  </label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="e.g. +6281574757617"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
                    required
                  />
                </div>
              )}

              {/* Conditional Input field for BNI Customer Link */}
              {userRole === UserRole.CUSTOMER && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Tautkan ke Outlet Customer
                  </label>
                  <select
                    value={userOutletLink}
                    onChange={(e) => setUserOutletLink(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none font-semibold"
                    required
                  >
                    <option value="">-- Pilih Outlet BNI --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.outlet}>
                        {c.outlet}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModal({ open: false })}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL 4: INVOICE PRICING & OFFICIAL AUTHORIZED SIGNATURE --- */}
      {selectedInvoiceJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">Lengkapi Rincian Invoice</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  PM {selectedInvoiceJob.customerName} • Jobcard: {selectedInvoiceJob.noJobcard}
                </p>
              </div>
              <button onClick={() => setSelectedInvoiceJob(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-left">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block border-b border-slate-100 pb-1">
                Masukkan Harga per Item / Mesin yang di-PM
              </span>

              {/* Items pricing fields */}
              <div className="space-y-3.5">
                {selectedInvoiceJob.machines.map((item, index) => (
                  <div key={item.id || index} className="grid grid-cols-12 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl items-center">
                    <div className="col-span-8 space-y-0.5">
                      <span className="text-xs font-extrabold text-slate-900">
                        {index + 1}. {item.mesin} {item.type}
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono">
                        No. Seri: {item.serialNumber} • {item.keterangan}
                      </p>
                    </div>
                    <div className="col-span-4">
                      <label className="text-[9px] font-bold text-gray-500 uppercase block mb-0.5">Harga (Rp)</label>
                      <input
                        type="number"
                        value={invoicePrices[item.id] || ""}
                        onChange={(e) => setInvoicePrices({
                          ...invoicePrices,
                          [item.id]: Number(e.target.value)
                        })}
                        placeholder="Rp"
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-950 font-bold outline-none text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Live calculation summary */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold tracking-wider uppercase">Estimasi Total Tagihan:</span>
                <span className="font-extrabold text-red-500 font-mono text-sm">
                  Rp, {selectedInvoiceJob.machines.reduce((sum, m) => sum + (invoicePrices[m.id] || 0), 0).toLocaleString()},-
                </span>
              </div>

              {/* Authorized Person Signature pad */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tanda Tangan Authorized CV. Athariz
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Wajib dibubuhkan untuk validasi legalitas dokumen invoice.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nama Pejabat Penandatangan</label>
                    <input
                      type="text"
                      value={invoiceAdminName}
                      onChange={(e) => setInvoiceAdminName(e.target.value)}
                      placeholder="e.g. Agung Setiawan"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-bold outline-none"
                    />
                  </div>

                  <SignaturePad
                    onSave={(base64) => setInvoiceAdminSign(base64)}
                    savedSignature={invoiceAdminSign}
                    placeholderName={invoiceAdminName}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceJob(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveInvoiceDetails}
                  disabled={!invoiceAdminSign}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all text-center ${
                    invoiceAdminSign
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-700/10"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Proses & Pratinjau Invoice
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL 5: PDF PREVIEW & EXPORT --- */}
      {pdfPreview && (
        <PDFPreviewModal
          jobcard={pdfPreview.jobcard}
          type={pdfPreview.type}
          onClose={() => setPdfPreview(null)}
        />
      )}

      {/* Bottom Status Footer */}
      <footer className="h-8 bg-white border-t border-gray-200 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4 text-[10px] font-medium text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Firebase Connected
          </span>
          <span>v2.1.0-stable</span>
        </div>
        <div className="text-[10px] font-bold text-[#C52328]">
          CV ATHARIZ TECHNOLOGY NOESANTARA - 2023
        </div>
      </footer>

      {/* Confirmation Modal */}
      {confirmationModal && confirmationModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm text-left">
            <h3 className="text-lg font-extrabold text-gray-900">{confirmationModal.title}</h3>
            <p className="text-sm text-gray-600 mt-2">{confirmationModal.message}</p>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setConfirmationModal(null)}
                className="px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Batal
              </button>
              <button 
                onClick={confirmationModal.onConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
