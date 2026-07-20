import React, { useState, useEffect } from "react";
import { User, Jobcard } from "../types";
import { Logo } from "./Logo";
import { PDFPreviewModal } from "./PDFPreviewModal";
import { getJobcards, isFirebaseActive } from "../lib/db";
import { 
  Building2, 
  FileText, 
  DollarSign, 
  History, 
  CheckCircle2, 
  Activity, 
  ShieldCheck, 
  LogOut, 
  TrendingUp, 
  Smartphone,
  Search,
  Lock
} from "lucide-react";

interface CustomerDashboardProps {
  user: User;
  onLogout: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user, onLogout }) => {
  const [history, setHistory] = useState<Jobcard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pdfPreview, setPdfPreview] = useState<{ jobcard: Jobcard; type: "lampiran" | "invoice" } | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const list = await getJobcards();
    // Filter jobcards by this customer's linked outlet name
    const customerOutlet = user.customerOutlet || "";
    const filtered = list.filter(
      (j) => j.customerName.toLowerCase() === customerOutlet.toLowerCase()
    );
    setHistory(filtered);
  };

  const filteredHistory = history.filter(
    (j) =>
      j.noJobcard.includes(searchTerm) ||
      j.tglPengerjaan.includes(searchTerm) ||
      j.teknisiName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Derive simple statistics
  const totalVisits = history.length;
  const completedVisits = history.filter(j => j.status === "Completed").length;
  const totalMachinesServiced = history.reduce((sum, j) => sum + j.machines.length, 0);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      
      {/* Top Header - Geometric Balance Style */}
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
            <p className="text-xs font-semibold text-gray-900 capitalize">Client: {user.fullName} ({user.customerOutlet})</p>
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

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 text-left">
        
        {/* Portal Greeting Banner - Geometric Balance Style */}
        <div className="bg-[#1A1A1A] border-l-4 border-[#C52328] text-white rounded-lg p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 z-10">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#C52328]">Selamat Datang</span>
            <h2 className="text-xl md:text-2xl font-extrabold leading-tight">BNI Branch Monitoring Portal</h2>
            <p className="text-xs md:text-sm text-gray-300 max-w-xl">
              Gunakan portal ini untuk melacak sejarah pengerjaan Preventive Maintenance (PM) mesin kantor cabang, status operasional, serta mendownload Lampiran Pengerjaan dan Invoice resmi Anda.
            </p>
          </div>
          <Building2 className="w-24 h-24 text-white/5 absolute -right-4 -bottom-4 pointer-events-none" />
        </div>

        {/* Status Bento Cards Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <History className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Kunjungan PM</span>
              <span className="text-xl font-extrabold text-slate-900">{totalVisits} Kali</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kunjungan Selesai</span>
              <span className="text-xl font-extrabold text-slate-900">{completedVisits} Kunjungan</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-sky-50 rounded-xl">
              <Activity className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Mesin di-PM</span>
              <span className="text-xl font-extrabold text-slate-900">{totalMachinesServiced} Perangkat</span>
            </div>
          </div>

        </div>

        {/* History Monitoring Table Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-600" /> Riwayat Preventive Maintenance (PM)
              </h3>
              <p className="text-xs text-slate-500">Menyajikan daftar sejarah pengerjaan oleh tim CV Athariz</p>
            </div>

            {/* Live Search */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari No. Jobcard, Tanggal, atau Teknisi..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>
          </div>

          {/* History Data Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No. Jobcard</th>
                  <th className="py-3 px-4">Tanggal Kunjungan</th>
                  <th className="py-3 px-4">Teknisi Lapangan</th>
                  <th className="py-3 px-4">Mesin di-PM</th>
                  <th className="py-3 px-4">Status Pekerjaan</th>
                  <th className="py-3 px-4 text-right">Laporan & Dokumen Resmi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHistory.map((job) => {
                  const isCompleted = job.status === "Completed";
                  const hasInvoice = (job.invoiceTotal || 0) > 0;
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">{job.noJobcard}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{job.tglPengerjaan}</td>
                      <td className="py-3 px-4 text-slate-900 capitalize">
                        <div className="flex flex-col text-left">
                          <span>{job.teknisiName}</span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-red-500" /> {job.teknisiPhone}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold leading-relaxed">
                        {job.machines.map(m => `${m.mesin} (${m.type})`).join(", ")}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          isCompleted 
                            ? "bg-green-50 text-green-700 border border-green-200" 
                            : "bg-red-50 text-red-600 border border-red-100"
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {isCompleted ? (
                            <>
                              {/* 1. Lampiran PDF */}
                              <button
                                onClick={() => setPdfPreview({ jobcard: job, type: "lampiran" })}
                                className="bg-sky-50 hover:bg-sky-100 text-sky-700 px-2.5 py-1.5 rounded font-bold flex items-center gap-1"
                                title="Download Lampiran Pengerjaan"
                              >
                                <FileText className="w-3.5 h-3.5" /> <span>Lampiran</span>
                              </button>

                              {/* 2. Invoice PDF (Only visible if admin has set prices) */}
                              {hasInvoice ? (
                                <button
                                  onClick={() => setPdfPreview({ jobcard: job, type: "invoice" })}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded font-bold flex items-center gap-1"
                                  title="Download Invoice Resmi"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> <span>Invoice</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic font-medium px-2 py-1 bg-slate-100 rounded">
                                  Invoice draf
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Kunjungan sedang dijadwalkan...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Belum ada sejarah kunjungan PM untuk cabang Anda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Bottom Status Footer */}
      <footer className="h-8 bg-white border-t border-gray-200 px-6 flex items-center justify-between shrink-0 z-20 mt-12">
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

      {/* PDF Export Modal */}
      {pdfPreview && (
        <PDFPreviewModal
          jobcard={pdfPreview.jobcard}
          type={pdfPreview.type}
          onClose={() => setPdfPreview(null)}
        />
      )}

    </div>
  );
};
