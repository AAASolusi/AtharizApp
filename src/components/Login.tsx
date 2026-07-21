import React, { useState } from "react";
import { User, UserRole } from "../types";
import { Logo } from "./Logo";
import { KeyRound, User as UserIcon, Phone, AlertCircle, RefreshCw, CheckCircle, Check, Eye, EyeOff, Fingerprint, X } from "lucide-react";
import { getUsers, saveUser, isFirebaseActive } from "../lib/db";
import { motion } from "motion/react";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>(UserRole.TECHNICIAN);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // States for password reset & change
  const [isResetting, setIsResetting] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // State for forced password change
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Quick Login / Biometric Simulation States
  const [rememberMe, setRememberMe] = useState(true);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"idle" | "scanning" | "success" | "failed">("idle");
  const [savedTech, setSavedTech] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("atn_quick_login_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const playScanSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      // Ignored
    }
  };

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      const gain2 = audioCtx.createGain();
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      gain2.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      
      osc1.start();
      osc2.start(audioCtx.currentTime + 0.1);
      osc1.stop(audioCtx.currentTime + 0.4);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      // Ignored
    }
  };

  const handleTriggerBiometric = () => {
    setShowBiometricModal(true);
    setBiometricStatus("scanning");
    playScanSound();
    
    setTimeout(() => {
      setBiometricStatus("success");
      playSuccessSound();
      
      setTimeout(() => {
        handleBiometricSuccess();
        setShowBiometricModal(false);
        setBiometricStatus("idle");
      }, 1200);
    }, 1800);
  };

  const handleBiometricSuccess = async () => {
    try {
      const users = await getUsers();
      let targetUsername = "wahyono"; // Default fallback
      if (savedTech) {
        targetUsername = savedTech.username;
      }
      
      const techUser = users.find(
        (u) => u.username.toLowerCase() === targetUsername.toLowerCase()
      );
      
      if (techUser) {
        onLoginSuccess(techUser);
      } else {
        setError("User teknisi tidak ditemukan di database!");
      }
    } catch (err) {
      setError("Autentikasi biometrik gagal memuat database.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setError("");
    setIsLoggingIn(true);

    if (!username || !password) {
      setError("Username dan password wajib diisi");
      setIsLoggingIn(false);
      return;
    }

    try {
      const users = await getUsers();
      const user = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!user || user.passwordHash !== password) {
        setError("Username atau Password tidak sesuai!");
        setIsLoggingIn(false);
        return;
      }

      // Check if user has default password
      if (user.isDefaultPassword) {
        setPendingUser(user);
        setIsLoggingIn(false);
        return;
      }

      if (rememberMe && user.role === UserRole.TECHNICIAN) {
        localStorage.setItem("atn_quick_login_user", JSON.stringify(user));
        setSavedTech(user);
      }

      onLoginSuccess(user);
    } catch (err) {
      setError("Gagal masuk. Silakan coba lagi.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);

    if (!resetUsername) {
      setResetMessage({ type: "error", text: "Username wajib diisi!" });
      return;
    }

    try {
      const users = await getUsers();
      const user = users.find((u) => u.username.toLowerCase() === resetUsername.trim().toLowerCase());

      if (!user) {
        setResetMessage({ type: "error", text: "Username tidak ditemukan!" });
        return;
      }

      // Automatically reset password to match username and flag as default password
      user.passwordHash = user.username;
      user.isDefaultPassword = true;
      await saveUser(user);

      setResetMessage({
        type: "success",
        text: `Password berhasil direset! Password baru Anda sekarang adalah sama dengan username Anda ("${user.username}"). Silakan login dan ubah password default Anda.`
      });
      setUsername(user.username);
      setPassword("");
    } catch (err) {
      setResetMessage({ type: "error", text: "Gagal mereset password." });
    }
  };

  const handleChangeDefaultPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isSuccess) return;
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Kedua password wajib diisi");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password baru minimal harus 8 karakter");
      return;
    }

    if (!/\d/.test(newPassword)) {
      setError("Password baru harus mengandung minimal satu angka");
      return;
    }

    if (newPassword === pendingUser?.username) {
      setError("Password baru tidak boleh sama dengan username");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    if (pendingUser) {
      setIsSaving(true);
      try {
        const updatedUser: User = {
          ...pendingUser,
          passwordHash: newPassword,
          isDefaultPassword: false,
        };
        await saveUser(updatedUser);
        
        // Trigger success animation state
        setIsSuccess(true);
        
        // Delay navigation to show success animation briefly
        setTimeout(() => {
          onLoginSuccess(updatedUser);
        }, 1500);
      } catch (err) {
        setError("Gagal memperbarui password.");
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F9FAFB] p-4 md:p-8 font-sans">
      
      {/* Background geometric grid detail */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* High-quality, transparent, and highly realistic company logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.035] transition-opacity duration-700">
        <div className="flex flex-col items-center justify-center transform scale-100 md:scale-125 rotate-[-12deg] filter grayscale contrast-125">
          <img
            src="/logo.png"
            alt="Company Watermark Logo"
            className="w-80 h-80 sm:w-96 sm:h-96 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="mt-4 flex flex-col items-center text-center">
            <span className="text-xl sm:text-2xl font-black tracking-[0.25em] text-gray-950 uppercase leading-none">
              CV. ATHARIZ TECHNOLOGY
            </span>
            <span className="text-xs sm:text-sm font-extrabold tracking-[0.45em] text-gray-900 uppercase font-mono leading-none mt-2">
              N O E S A N T A R A
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 transition-all">
          
          <div className="flex flex-col items-center justify-center mb-8">
            <Logo size={70} />
            <h1 className="text-lg font-bold text-gray-900 mt-4 tracking-tight text-center uppercase">
              MAINTENANCE JOBCARD PORTAL
            </h1>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-semibold">CV. Athariz Technology Noesantara</p>
            
            {/* Connection Status Badge */}
            <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200/60 select-none">
              <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseActive ? "bg-green-600 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-600">
                Koneksi Database: {isFirebaseActive ? "Firebase (Aktif)" : "Lokal (Offline)"}
              </span>
            </div>
          </div>

          {/* Forced Password Change Form */}
          {pendingUser ? (
            <form onSubmit={handleChangeDefaultPassword} className="space-y-5">
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider">Wajib Ubah Password Default!</span>
                  <p className="mt-0.5 text-red-600">
                    Anda menggunakan password bawaan. Silakan buat password baru yang aman demi privasi akun Anda.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#C52328] focus:ring-1 focus:ring-[#C52328] transition-all font-bold"
                    required
                    disabled={isSaving || isSuccess}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time feedback for Password Baru criteria */}
                {newPassword.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 bg-gray-50 border border-gray-100 p-3 rounded-lg text-[11px] text-left">
                    <p className="font-bold text-gray-500 uppercase tracking-wider text-[9px] mb-1">Kriteria Keamanan:</p>
                    <div className="flex items-center gap-1.5">
                      {newPassword.length >= 8 ? (
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-red-500 font-extrabold text-sm shrink-0">×</span>
                      )}
                      <span className={newPassword.length >= 8 ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
                        Minimal 8 karakter (saat ini: {newPassword.length} karakter)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/\d/.test(newPassword) ? (
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-red-500 font-extrabold text-sm shrink-0">×</span>
                      )}
                      <span className={/\d/.test(newPassword) ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
                        Mengandung minimal 1 angka (0-9)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#C52328] focus:ring-1 focus:ring-[#C52328] transition-all font-bold"
                    required
                    disabled={isSaving || isSuccess}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time feedback for Password Confirmation */}
                {confirmPassword.length > 0 && (
                  <div className="mt-1.5 text-left pl-1">
                    {newPassword === confirmPassword ? (
                      <div className="flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        Konfirmasi password cocok
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                        <span className="text-red-500 font-extrabold text-sm">×</span>
                        Konfirmasi password tidak cocok
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSaving || isSuccess}
                  onClick={() => {
                    setPendingUser(null);
                    setError("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded text-xs font-bold hover:bg-gray-50 transition-all uppercase tracking-wider disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isSuccess}
                  className={`flex-1 px-4 py-2.5 rounded text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center min-h-[38px] ${
                    isSuccess
                      ? "bg-green-600 text-white hover:bg-green-600 shadow-lg shadow-green-500/20"
                      : isSaving
                      ? "bg-slate-400 text-white cursor-not-allowed"
                      : "bg-[#C52328] text-white hover:bg-red-700"
                  }`}
                >
                  {isSuccess ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="flex items-center gap-1 text-white font-bold"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0 text-white" />
                      <span>Berhasil</span>
                    </motion.div>
                  ) : isSaving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Simpan & Lanjutkan</span>
                  )}
                </button>
              </div>
            </form>
          ) : isResetting ? (
            /* Reset Password Form */
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-1">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Reset Password</h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetting(false);
                    setResetMessage(null);
                  }}
                  className="text-xs text-[#C52328] font-bold hover:underline uppercase tracking-wide"
                >
                  Kembali
                </button>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Masukkan username Anda. Sistem akan secara otomatis mereset password Anda menjadi sama persis dengan username Anda.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Username Akun
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#C52328] focus:ring-1 focus:ring-[#C52328] transition-all"
                    required
                  />
                </div>
              </div>

              {resetMessage && (
                <div
                  className={`text-xs p-3 rounded border flex items-start gap-2 ${
                    resetMessage.type === "success"
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {resetMessage.type === "success" ? (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  )}
                  <span>{resetMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#C52328] text-white rounded text-xs font-bold hover:bg-red-700 transition-all flex justify-center items-center gap-1.5 uppercase tracking-wider"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Sekarang
              </button>
            </form>
          ) : (
            /* Normal Login Form */
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#C52328] focus:ring-1 focus:ring-[#C52328] transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetting(true);
                      setResetUsername(username);
                    }}
                    className="text-[10px] text-[#C52328] font-bold hover:underline uppercase tracking-wider"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-[#C52328] focus:ring-1 focus:ring-[#C52328] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#C52328] focus:ring-[#C52328]"
                  />
                  <span className="text-[10px] text-gray-600 font-extrabold uppercase tracking-wider">
                    Simpan Akun & Aktifkan Masuk Cepat
                  </span>
                </label>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className={`w-full py-3 text-white rounded text-xs font-bold transition-all uppercase tracking-widest shadow-sm mt-2 flex items-center justify-center gap-2 ${
                  isLoggingIn
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-[#C52328] hover:bg-red-700"
                }`}
              >
                {isLoggingIn ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Masuk Sistem</span>
                )}
              </button>

              {/* Quick Login Section */}
              <div className="relative my-4 flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">Atau Masuk Cepat</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {savedTech ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-left">
                  <div className="min-w-0 flex-grow">
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">Akun Terdaftar</p>
                    <p className="text-xs font-extrabold text-slate-800 truncate capitalize">Teknisi: {savedTech.fullName || savedTech.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerBiometric}
                    className="px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm shadow-red-700/10"
                  >
                    <Fingerprint className="w-4 h-4" /> Biometrik
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerBiometric}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl border border-gray-200/60 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4 text-[#C52328]" />
                  Simulasi Masuk Cepat (Biometrik)
                </button>
              )}

              <div className="text-center mt-3 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Layanan Kontak CV ATN: info@athariztechnology.com
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Biometric Simulator Modal */}
      {showBiometricModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 max-w-sm w-full p-6 shadow-2xl space-y-6 text-center relative overflow-hidden">
            
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-red-500/5 rounded-full filter blur-xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-red-500/5 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-600 bg-red-50 px-2.5 py-0.5 rounded">
                Keamanan Biometrik
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowBiometricModal(false);
                  setBiometricStatus("idle");
                }}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              {/* Fingerprint Ring Graphic with Laser scan line */}
              <div className="relative w-28 h-28 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200/60 shadow-inner">
                <Fingerprint className={`w-16 h-16 transition-all duration-500 ${
                  biometricStatus === "scanning" 
                    ? "text-red-500 animate-pulse" 
                    : biometricStatus === "success" 
                    ? "text-green-600 scale-110" 
                    : "text-slate-400"
                }`} />
                
                {/* Holographic Laser Scanning Line */}
                {biometricStatus === "scanning" && (
                  <div className="absolute inset-x-4 h-[2px] bg-red-500 shadow-[0_0_12px_#ef4444] animate-bounce" />
                )}
                
                {/* Green Success Outer Ring */}
                {biometricStatus === "success" && (
                  <div className="absolute inset-0 rounded-full border-4 border-green-500/80 animate-ping opacity-75" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800">
                  {biometricStatus === "scanning" 
                    ? "Memindai Biometrik..." 
                    : biometricStatus === "success" 
                    ? "Autentikasi Berhasil!" 
                    : "Gunakan Sidik Jari / Face ID"}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto font-bold">
                  {biometricStatus === "scanning" 
                    ? "Menghubungkan ke secure enclave perangkat Anda..." 
                    : biometricStatus === "success" 
                    ? "Kredensial diverifikasi. Membuka portal..." 
                    : `Masuk sebagai: ${savedTech ? (savedTech.fullName || savedTech.username) : "wahyono (Simulasi)"}`}
                </p>
              </div>
            </div>

            {biometricStatus === "idle" && (
              <button
                type="button"
                onClick={handleTriggerBiometric}
                className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                Mulai Pemindaian
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
