import React, { useState, useEffect, useRef } from "react";
import { User, Jobcard, MachineItem } from "../types";
import { Logo } from "./Logo";
import { SignaturePad } from "./SignaturePad";
import { PDFPreviewModal } from "./PDFPreviewModal";
import { getJobcards, saveJobcard, getCustomers, db, isFirebaseActive } from "../lib/db";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { 
  ClipboardList, 
  Plus, 
  Camera, 
  Image, 
  CheckCircle, 
  FileText, 
  LogOut, 
  Phone, 
  User as UserIcon, 
  Trash2, 
  Layers, 
  AlertTriangle,
  History,
  Bell,
  BellRing,
  X,
  Volume2,
  VolumeX
} from "lucide-react";

interface TechnicianProps {
  user: User;
  onLogout: () => void;
}

export const TechnicianDashboard: React.FC<TechnicianProps> = ({ user, onLogout }) => {
  const [jobcards, setJobcards] = useState<Jobcard[]>([]);
  const [activeJobcard, setActiveJobcard] = useState<Jobcard | null>(() => {
    try {
      const stored = localStorage.getItem(`atn_tech_active_jobcard_${user.id}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<"pending" | "completed">((localStorage.getItem(`atn_tech_active_tab_${user.id}`) as "pending" | "completed") || "pending");
  
  // Create Jobcard State
  const [isCreating, setIsCreating] = useState(() => localStorage.getItem(`atn_tech_is_creating_${user.id}`) === "true");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustId, setSelectedCustId] = useState(() => localStorage.getItem(`atn_tech_selected_cust_id_${user.id}`) || "");
  const [customCustName, setCustomCustName] = useState(() => localStorage.getItem(`atn_tech_custom_cust_name_${user.id}`) || "");
  const [customCustAddress, setCustomCustAddress] = useState(() => localStorage.getItem(`atn_tech_custom_cust_address_${user.id}`) || "");
  
  // Machine list builder state for new jobcard
  const [newMachines, setNewMachines] = useState<Omit<MachineItem, "id">[]>(() => {
    try {
      const stored = localStorage.getItem(`atn_tech_new_machines_${user.id}`);
      return stored ? JSON.parse(stored) : [
        { mesin: "Glory", type: "Usf 52", serialNumber: "", keterangan: "Preventive maintenance" }
      ];
    } catch {
      return [
        { mesin: "Glory", type: "Usf 52", serialNumber: "", keterangan: "Preventive maintenance" }
      ];
    }
  });

  // Editing state of active jobcard
  const [activeSignature, setActiveSignature] = useState(() => localStorage.getItem(`atn_tech_active_signature_${user.id}`) || "");
  const [activePhotos, setActivePhotos] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`atn_tech_active_photos_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isCompressing, setIsCompressing] = useState(false);
  const [tempMachineItems, setTempMachineItems] = useState<MachineItem[]>(() => {
    try {
      const stored = localStorage.getItem(`atn_tech_temp_machine_items_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Preview State
  const [previewJobcard, setPreviewJobcard] = useState<Jobcard | null>(null);

  // Real-time notifications and seen tracking states
  const [seenJobcards, setSeenJobcards] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`seen_jobcards_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeToasts, setActiveToasts] = useState<{ id: string; jobcard: Jobcard }[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const isFirstLoad = useRef(true);

  // Persistent State Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(`atn_tech_is_creating_${user.id}`, String(isCreating));
  }, [isCreating, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_selected_cust_id_${user.id}`, selectedCustId);
  }, [selectedCustId, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_custom_cust_name_${user.id}`, customCustName);
  }, [customCustName, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_custom_cust_address_${user.id}`, customCustAddress);
  }, [customCustAddress, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_new_machines_${user.id}`, JSON.stringify(newMachines));
  }, [newMachines, user.id]);

  useEffect(() => {
    if (activeJobcard) {
      localStorage.setItem(`atn_tech_active_jobcard_${user.id}`, JSON.stringify(activeJobcard));
    } else {
      localStorage.removeItem(`atn_tech_active_jobcard_${user.id}`);
    }
  }, [activeJobcard, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_active_signature_${user.id}`, activeSignature);
  }, [activeSignature, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_active_photos_${user.id}`, JSON.stringify(activePhotos));
  }, [activePhotos, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_temp_machine_items_${user.id}`, JSON.stringify(tempMachineItems));
  }, [tempMachineItems, user.id]);

  useEffect(() => {
    localStorage.setItem(`atn_tech_active_tab_${user.id}`, activeTab);
  }, [activeTab, user.id]);

  // Play synthetic alert sound using Web Audio API
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 150);
    } catch (e) {
      // Audio might be blocked by browser autoplay policy, ignore
    }
  };

  const showRealtimeNotification = (j: Jobcard) => {
    setActiveToasts((prev) => {
      if (prev.some((t) => t.id === j.id)) return prev;
      return [...prev, { id: j.id, jobcard: j }];
    });
    playAlertSound();
  };

  const markAsSeen = (jobcardId: string) => {
    setSeenJobcards((prev) => {
      if (prev.includes(jobcardId)) return prev;
      const next = [...prev, jobcardId];
      localStorage.setItem(`seen_jobcards_${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  const markAllAsSeen = () => {
    const pendingIds = jobcards.filter(j => j.status === "Pending").map(j => j.id);
    setSeenJobcards((prev) => {
      const next = Array.from(new Set([...prev, ...pendingIds]));
      localStorage.setItem(`seen_jobcards_${user.id}`, JSON.stringify(next));
      return next;
    });
  };

  const handleDismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleViewJobcardFromToast = (j: Jobcard) => {
    markAsSeen(j.id);
    setActiveToasts((prev) => prev.filter((t) => t.id !== j.id));
    startCompletingJobcard(j);
    setActiveTab("pending");
    setShowNotifDropdown(false);
  };

  const updateJobcardsList = (newList: Jobcard[]) => {
    setJobcards((prevJobcards) => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return newList;
      }
      
      const prevIds = new Set(prevJobcards.map(j => j.id));
      const newlyAdded = newList.filter(j => j.status === "Pending" && !prevIds.has(j.id));
      
      if (newlyAdded.length > 0) {
        newlyAdded.forEach(j => {
          showRealtimeNotification(j);
        });
      }
      return newList;
    });
  };

  useEffect(() => {
    fetchCustomers();

    let unsubscribe: (() => void) | undefined;

    if (isFirebaseActive && db) {
      try {
        const q = query(collection(db, "jobcards"), where("teknisiId", "==", user.id));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: Jobcard[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Jobcard);
          });
          updateJobcardsList(list);
        }, (error) => {
          console.error("Firestore real-time subscription error, switching to manual mode:", error);
          fetchJobcards();
        });
      } catch (err) {
        console.warn("Could not start real-time subscription, falling back to polling/manual fetch:", err);
        fetchJobcards();
      }
    } else {
      // Offline / LocalStorage mode: fetch once initially and poll
      fetchJobcards();
      const interval = setInterval(() => {
        fetchJobcards();
      }, 5000);
      return () => clearInterval(interval);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchJobcards = async () => {
    const list = await getJobcards();
    const filtered = list.filter((j) => j.teknisiId === user.id);
    updateJobcardsList(filtered);
  };

  const fetchCustomers = async () => {
    const list = await getCustomers();
    setCustomers(list);
  };

  // Dynamic address fill-in on customer select
  const handleCustomerSelect = (id: string) => {
    setSelectedCustId(id);
    if (id === "custom") {
      setCustomCustName("");
      setCustomCustAddress("");
    } else {
      const c = customers.find((cust) => cust.id === id);
      if (c) {
        setCustomCustName(c.outlet);
        setCustomCustAddress(c.alamat);
      }
    }
  };

  const addMachineRow = () => {
    setNewMachines([
      ...newMachines,
      { mesin: "Glory", type: "", serialNumber: "", keterangan: "Preventive maintenance" }
    ]);
  };

  const updateMachineRow = (index: number, field: keyof Omit<MachineItem, "id">, val: string) => {
    const copy = [...newMachines];
    copy[index] = { ...copy[index], [field]: val };
    setNewMachines(copy);
  };

  const deleteMachineRow = (index: number) => {
    if (newMachines.length <= 1) return;
    setNewMachines(newMachines.filter((_, i) => i !== index));
  };

  const handleCreateJobcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCustName || !customCustAddress) {
      alert("Nama customer dan alamat wajib terisi!");
      return;
    }

    // Verify all serial numbers are entered
    const hasEmptySerial = newMachines.some((m) => !m.serialNumber.trim());
    if (hasEmptySerial) {
      alert("Harap isi semua Nomor Seri mesin pengerjaan!");
      return;
    }

    const newJob: Jobcard = {
      id: "job-" + Date.now(),
      noJobcard: String(Math.floor(10000000 + Math.random() * 90000000)), // dynamic 8 digit card num
      customerName: customCustName,
      customerAddress: customCustAddress,
      tglPengerjaan: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD
      teknisiId: user.id,
      teknisiName: user.fullName || user.username,
      teknisiPhone: user.phone || "+6281574757617",
      status: "Pending",
      photos: [],
      machines: newMachines.map((m, idx) => ({ ...m, id: `m-new-${idx}-${Date.now()}` }))
    };

    await saveJobcard(newJob);
    setIsCreating(false);
    // Reset states
    setSelectedCustId("");
    setCustomCustName("");
    setCustomCustAddress("");
    setNewMachines([{ mesin: "Glory", type: "Usf 52", serialNumber: "", keterangan: "Preventive maintenance" }]);
    
    // Refresh
    fetchJobcards();
  };

  // Compress image before base64 conversion to avoid exceeding Firestore's 1MB document size limit
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while keeping aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas 2D context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress as JPEG
          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle Photo uploading & reading as Base64 with high-quality compression
  const processFiles = async (files: FileList) => {
    const totalRemaining = 8 - activePhotos.length;
    if (totalRemaining <= 0) {
      alert("Maksimal 8 foto pengerjaan diperbolehkan.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, totalRemaining);
    setIsCompressing(true);

    try {
      const compressedResults: string[] = [];
      for (const file of filesToUpload) {
        try {
          const compressed = await compressImage(file, 800, 800, 0.6);
          compressedResults.push(compressed);
        } catch (err) {
          console.error("Gagal mengompresi foto:", err);
        }
      }
      if (compressedResults.length > 0) {
        setActivePhotos((prev) => [...prev, ...compressedResults]);
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCameraUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removePhoto = (idx: number) => {
    setActivePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const startCompletingJobcard = (job: Jobcard) => {
    setActiveJobcard(job);
    setActivePhotos(job.photos || []);
    setActiveSignature(job.signatureBase64 || "");
    setTempMachineItems([...job.machines]);
  };

  const handleCompleteJobcard = async () => {
    if (!activeJobcard) return;
    
    if (activePhotos.length < 1) {
      alert("Harap unggah minimal 1 foto bukti pengerjaan (maksimal 8 foto)!");
      return;
    }

    if (!activeSignature) {
      alert("Tanda tangan digital wajib dibubuhkan sebelum menyelesaikan pekerjaan!");
      return;
    }

    const completedJob: Jobcard = {
      ...activeJobcard,
      status: "Completed",
      photos: activePhotos,
      signatureBase64: activeSignature,
      signatureName: user.fullName || user.username,
      machines: tempMachineItems,
      completedAt: new Date().toISOString()
    };

    await saveJobcard(completedJob);
    setActiveJobcard(null);
    setActivePhotos([]);
    setActiveSignature("");
    setTempMachineItems([]);
    fetchJobcards();
    alert("Pekerjaan berhasil diselesaikan! Laporan otomatis dikirim ke Admin.");
  };

  const unseenPendingJobcards = jobcards.filter(j => j.status === "Pending" && !seenJobcards.includes(j.id));
  const unseenCount = unseenPendingJobcards.length;

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
            <p className="text-xs font-semibold text-gray-900 capitalize">Teknisi: {user.fullName}</p>
            <p className={`text-[10px] ${isFirebaseActive ? "text-green-600" : "text-amber-500"} font-medium flex items-center justify-end uppercase`}>
              <span className={`w-1.5 h-1.5 ${isFirebaseActive ? "bg-green-500" : "bg-amber-500"} rounded-full mr-1.5`}></span>
              {isFirebaseActive ? "Database: Firebase (Aktif)" : "Database: Lokal (Offline)"}
            </p>
          </div>

          {/* Notification Bell with Badge and Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 text-gray-600 hover:text-[#C52328] hover:bg-gray-100 rounded-full transition-colors relative focus:outline-none"
              title="Notifikasi"
            >
              {unseenCount > 0 ? (
                <BellRing className="w-5 h-5 text-[#C52328] animate-pulse" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
              {unseenCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#C52328] text-white text-[9px] font-extrabold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white leading-none">
                  {unseenCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 text-left overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#C52328]" /> Notifikasi Tugas ({unseenCount})
                  </span>
                  {unseenCount > 0 && (
                    <button
                      onClick={markAllAsSeen}
                      className="text-[10px] text-red-600 hover:text-red-800 font-extrabold"
                    >
                      Tandai Semua Dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                  {unseenPendingJobcards.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      <p className="text-xs font-semibold">Tidak ada notifikasi baru</p>
                      <p className="text-[10px] text-gray-400 mt-1">Semua tugas PM telah dibaca.</p>
                    </div>
                  ) : (
                    unseenPendingJobcards.map((j) => (
                      <div
                        key={j.id}
                        className="p-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                        onClick={() => handleViewJobcardFromToast(j)}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wider">
                            PM Baru
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">{j.tglPengerjaan}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 mt-1 capitalize truncate">
                          {j.customerName}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          No Card: {j.noJobcard} • {j.machines.length} Mesin
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsSeen(j.id);
                          }}
                          className="text-[9px] text-red-600 hover:underline mt-1 font-bold block"
                        >
                          Tandai dibaca
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-[#C52328] text-gray-700 hover:text-white rounded border border-gray-200 transition-colors text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Profile Card Mobile - Geometric Solid Style */}
        <div className="bg-[#1A1A1A] border-l-4 border-[#C52328] text-white rounded-lg p-5 shadow flex items-center justify-between">
          <div className="space-y-1 text-left">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#C52328]">Teknisi Lapangan</span>
            <h2 className="text-base font-bold capitalize leading-none">{user.fullName}</h2>
            <p className="text-xs text-gray-400 font-mono mt-1">{user.phone || "+6281574757617"}</p>
          </div>
          <ClipboardList className="w-10 h-10 text-white/10" />
        </div>

        {/* Create Jobcard Form Box */}
        {isCreating ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 transition-all text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" /> Buat Jobcard PM Baru
              </h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-gray-500 font-semibold hover:underline"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleCreateJobcard} className="space-y-5">
              {/* Customer Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Pilih Customer (Outlet)
                </label>
                <select
                  value={selectedCustId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-slate-900 outline-none"
                  required
                >
                  <option value="">-- Pilih BNI Outlet --</option>
                  <option value="custom">[+] Masukkan Outlet Custom</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.wilayah}] - {c.outlet}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom fields if dynamic select is custom */}
              {selectedCustId && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Nama Customer / Outlet
                    </label>
                    <input
                      type="text"
                      value={customCustName}
                      onChange={(e) => setCustomCustName(e.target.value)}
                      placeholder="Contoh: BNI CIOMAS"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-950 focus:ring-2 focus:ring-red-500 outline-none"
                      disabled={selectedCustId !== "custom"}
                      required
                    />
                  </div>
                  <div className="md:col-span-12">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Alamat Lengkap Outlet
                    </label>
                    <textarea
                      value={customCustAddress}
                      onChange={(e) => setCustomCustAddress(e.target.value)}
                      placeholder="Masukkan alamat lengkap"
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-950 focus:ring-2 focus:ring-red-500 outline-none"
                      disabled={selectedCustId !== "custom"}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Multi-machine entry builder (Crucial to make invoice like BNI Ciomas) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Daftar Mesin yang di-PM
                  </label>
                  <button
                    type="button"
                    onClick={addMachineRow}
                    className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded font-bold hover:bg-red-100 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris Mesin
                  </button>
                </div>

                <div className="space-y-3">
                  {newMachines.map((m, idx) => (
                    <div 
                      key={idx} 
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-white border border-slate-200 rounded-xl relative"
                    >
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Nama Mesin</label>
                        <select
                          value={m.mesin}
                          onChange={(e) => updateMachineRow(idx, "mesin", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-950 outline-none"
                        >
                          <option value="Glory">Glory</option>
                          <option value="Compuprint">Compuprint</option>
                          <option value="Epson">Epson</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Tipe</label>
                        <input
                          type="text"
                          value={m.type}
                          onChange={(e) => updateMachineRow(idx, "type", e.target.value)}
                          placeholder="e.g. Usf 52 / PLQ20"
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-950 outline-none"
                          required
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">No. Seri (Serial Number)</label>
                        <input
                          type="text"
                          value={m.serialNumber}
                          onChange={(e) => updateMachineRow(idx, "serialNumber", e.target.value)}
                          placeholder="e.g. 77998"
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-950 outline-none"
                          required
                        />
                      </div>

                      <div className="md:col-span-3 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Keterangan</label>
                          <input
                            type="text"
                            value={m.keterangan}
                            onChange={(e) => updateMachineRow(idx, "keterangan", e.target.value)}
                            placeholder="e.g. Preventive maintenance"
                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-950 outline-none"
                          />
                        </div>
                        {newMachines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteMachineRow(idx)}
                            className="bg-red-50 text-red-600 p-1.5 rounded hover:bg-red-100 transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md"
                >
                  Simpan Jobcard
                </button>
              </div>
            </form>
          </div>
        ) : activeJobcard ? (
          /* ACTIVE JOBCARD COMPLETION & PHOTOS UPLOAD WORKSPACE */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  Pengerjaan Aktif
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  PM {activeJobcard.customerName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveJobcard(null)}
                className="text-xs text-gray-500 font-semibold hover:underline"
              >
                Kembali
              </button>
            </div>

            {/* Quick Details */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-1.5">
              <p>
                <span className="font-bold text-slate-600">No. Jobcard:</span> <span className="font-mono text-slate-900 font-bold">{activeJobcard.noJobcard}</span>
              </p>
              <p>
                <span className="font-bold text-slate-600">Alamat:</span> <span className="text-slate-700">{activeJobcard.customerAddress}</span>
              </p>
              <p>
                <span className="font-bold text-slate-600">Tanggal:</span> <span className="text-slate-700">{activeJobcard.tglPengerjaan}</span>
              </p>
            </div>

            {/* Itemized Machines verification inside active */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mesin di-Maintenance ({tempMachineItems.length})
              </h3>
              {/* Stacked Cards for mobile */}
              <div className="block sm:hidden space-y-2.5">
                {tempMachineItems.map((m, idx) => (
                  <div key={m.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-bold text-red-600">Mesin {idx + 1}</span>
                      <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-700 font-semibold">{m.mesin}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Tipe</span>
                        <span className="text-slate-800 font-medium">{m.type}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Serial Number</span>
                        <span className="text-slate-800 font-mono font-medium">{m.serialNumber}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Keterangan</span>
                      <span className="text-slate-800 font-medium">{m.keterangan}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table for desktop screens */}
              <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-lg text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-3">No.</th>
                      <th className="py-2 px-3">Mesin</th>
                      <th className="py-2 px-3">Tipe</th>
                      <th className="py-2 px-3">Serial Number</th>
                      <th className="py-2 px-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tempMachineItems.map((m, idx) => (
                      <tr key={m.id || idx}>
                        <td className="py-2 px-3 text-slate-500">{idx + 1}.</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{m.mesin}</td>
                        <td className="py-2 px-3 text-slate-700">{m.type}</td>
                        <td className="py-2 px-3 font-mono font-medium">{m.serialNumber}</td>
                        <td className="py-2 px-3 text-slate-600">{m.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upload Photos Section - Crucial separated buttons layout */}
            <div className="space-y-3.5 border-t border-slate-100 pt-5">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Foto Bukti Pengerjaan (Maksimal 8 Foto)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Unggah bukti pengerjaan mesin sebelum/sesudah dibongkar. ({activePhotos.length}/8 foto)
                </p>
              </div>

              {/* TWO SEPARATED DISTINCT ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Ambil Foto (Kamera Langsung) */}
                <label className={`flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl transition-all gap-1.5 ${
                  isCompressing || activePhotos.length >= 8 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"
                }`}>
                  <Camera className="w-6 h-6 text-red-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">Ambil Foto (Kamera)</span>
                  <span className="text-[10px] text-slate-400">Gunakan Kamera HP</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraUpload}
                    className="hidden"
                    disabled={isCompressing || activePhotos.length >= 8}
                  />
                </label>

                {/* 2. Pilih Dari Galeri */}
                <label className={`flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl transition-all gap-1.5 ${
                  isCompressing || activePhotos.length >= 8 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"
                }`}>
                  <Image className="w-6 h-6 text-red-600" />
                  <span className="text-xs font-bold text-slate-700">Pilih dari Galeri</span>
                  <span className="text-[10px] text-slate-400">Pilih foto tersimpan</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                    disabled={isCompressing || activePhotos.length >= 8}
                  />
                </label>
              </div>

              {/* Compressing Indicator */}
              {isCompressing && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-800 text-xs font-semibold animate-pulse justify-center">
                  <span className="w-4 h-4 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
                  <span>Sedang memproses & mengompresi foto agar ukuran dokumen optimal...</span>
                </div>
              )}

              {/* Photos Preview Grid */}
              {activePhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {activePhotos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-300 bg-black group shadow-sm">
                      <img src={photo} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 shadow transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 font-semibold">
                        Foto Bukti {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature Section */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tanda Tangan & Konfirmasi Teknisi
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Bubuhkan tanda tangan Anda selaku teknisi penanggung jawab di lapangan. Nama tercatat: <span className="font-bold text-slate-700">{user.fullName}</span>
                </p>
              </div>

              <SignaturePad
                onSave={(base64) => setActiveSignature(base64)}
                savedSignature={activeSignature}
                placeholderName={user.fullName}
              />
            </div>

            {/* Error alerts */}
            {activePhotos.length < 1 && (
              <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Harap unggah minimal 1 foto bukti pengerjaan (Sangat disarankan mengupload 8 foto untuk Lampiran PDF yang rapi)</span>
              </div>
            )}

            {/* Submission Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCompleteJobcard}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-green-700/10 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Tandai Pekerjaan Selesai
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewJobcard({
                    ...activeJobcard,
                    photos: activePhotos,
                    signatureBase64: activeSignature,
                    signatureName: user.fullName,
                    machines: tempMachineItems,
                    status: "Completed"
                  })}
                  className="py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  <FileText className="w-4 h-4" /> Pratinjau Lampiran
                </button>
                <button
                  type="button"
                  onClick={() => setActiveJobcard(null)}
                  className="py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-xs rounded-lg transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TASKS LIST & DASHBOARD */
          <div className="space-y-5">
            <div className="flex justify-between items-center text-left">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ClipboardList className="w-5 h-5 text-red-600" /> {activeTab === "pending" ? "Daftar Tugas PM Anda" : "Riwayat Jobcard Selesai"}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeTab === "pending" 
                    ? "Melihat daftar tugas harian / mingguan yang ditugaskan" 
                    : "Melihat daftar tugas yang telah selesai dikerjakan"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-700/10 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" /> Jobcard Baru
              </button>
            </div>

            {/* Elegant Tab Toggles */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
                  activeTab === "pending"
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Tugas Aktif ({jobcards.filter((j) => j.status !== "Completed").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all ${
                  activeTab === "completed"
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <History className="w-4 h-4" />
                Riwayat Selesai ({jobcards.filter((j) => j.status === "Completed").length})
              </button>
            </div>

            {/* Jobcards Grid */}
            {(() => {
              const displayedJobcards = jobcards.filter((j) => 
                activeTab === "completed" ? j.status === "Completed" : j.status !== "Completed"
              );

              if (displayedJobcards.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
                    {activeTab === "completed" ? (
                      <History className="w-12 h-12 text-slate-200 mx-auto" />
                    ) : (
                      <ClipboardList className="w-12 h-12 text-slate-200 mx-auto" />
                    )}
                    <p className="text-sm font-semibold">
                      {activeTab === "pending" ? "Belum ada tugas PM yang dijadwalkan." : "Belum ada riwayat jobcard selesai."}
                    </p>
                    {activeTab === "pending" && (
                      <p className="text-xs text-slate-400">Silakan klik "Jobcard Baru" untuk melaporkan pengerjaan mandiri.</p>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedJobcards.map((job) => {
                    const isCompleted = job.status === "Completed";
                    const isUnseen = !isCompleted && !seenJobcards.includes(job.id);
                    return (
                      <div 
                        key={job.id} 
                        className={`bg-white rounded-2xl border transition-all text-left flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                          isCompleted ? "border-green-100 hover:border-green-200" : "border-slate-200 hover:border-red-200"
                        }`}
                      >
                        {/* Card Content */}
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-mono font-bold text-slate-400">
                                NO. JOBCARD: {job.noJobcard}
                              </span>
                              <h3 className="text-sm font-extrabold text-slate-900 leading-tight mt-0.5">
                                {job.customerName}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isUnseen && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white animate-pulse flex items-center gap-0.5 shadow-sm">
                                  <Bell className="w-2.5 h-2.5" /> BARU
                                </span>
                              )}
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                isCompleted 
                                  ? "bg-green-50 text-green-700 border border-green-200" 
                                  : "bg-red-50 text-red-600 border border-red-100"
                              }`}>
                                {isCompleted ? "SELESAI" : "PENDING"}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="space-y-1.5 text-xs text-slate-600">
                            <p className="line-clamp-2">
                              <span className="font-semibold">Alamat:</span> {job.customerAddress}
                            </p>
                            <p>
                              <span className="font-semibold">Tanggal PM:</span> {job.tglPengerjaan}
                            </p>
                            <p>
                              <span className="font-semibold">Mesin:</span> {job.machines.map(m => `${m.mesin} ${m.type}`).join(", ")}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end gap-2.5">
                          {isCompleted ? (
                            <button
                              type="button"
                              onClick={() => setPreviewJobcard(job)}
                              className="bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-sky-100 transition-all flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> Cetak Lampiran PDF
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (isUnseen) {
                                  markAsSeen(job.id);
                                }
                                startCompletingJobcard(job);
                              }}
                              className="bg-red-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Kerjakan PM
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

      </main>

      {/* Bottom Status Footer */}
      <footer className="h-8 bg-white border-t border-gray-200 px-6 flex items-center justify-between shrink-0 z-20 mt-10">
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
      {previewJobcard && (
        <PDFPreviewModal
          jobcard={previewJobcard}
          type="lampiran"
          onClose={() => setPreviewJobcard(null)}
        />
      )}

      {/* Floating Real-time Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm px-4 sm:px-0">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-[#1A1A1A] text-white border-l-4 border-[#C52328] rounded-xl p-4 shadow-2xl flex items-start gap-3.5 transform translate-y-0 transition-all"
          >
            <div className="bg-red-950/50 p-2 rounded-lg text-red-500 mt-0.5">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-[10px] uppercase font-black text-red-500 tracking-widest">Tugas PM Baru Ditugaskan!</p>
                <button
                  onClick={() => handleDismissToast(toast.id)}
                  className="text-gray-400 hover:text-white transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-bold mt-1 text-gray-100 capitalize truncate">
                {toast.jobcard.customerName}
              </p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                Jobcard: {toast.jobcard.noJobcard} • {toast.jobcard.machines.length} Mesin
              </p>
              <div className="flex gap-2.5 mt-2.5">
                <button
                  onClick={() => handleViewJobcardFromToast(toast.jobcard)}
                  className="bg-[#C52328] hover:bg-[#A31B1E] text-white text-[10px] font-extrabold px-3 py-1.5 rounded transition-all shadow-sm"
                >
                  Kerjakan Sekarang
                </button>
                <button
                  onClick={() => {
                    markAsSeen(toast.id);
                    handleDismissToast(toast.id);
                  }}
                  className="bg-transparent hover:bg-white/10 text-gray-300 hover:text-white text-[10px] font-bold px-2.5 py-1.5 rounded border border-white/20 transition-all"
                >
                  Tutup & Simpan
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
