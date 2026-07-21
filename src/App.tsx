import React, { useState, useEffect } from "react";
import { User, UserRole } from "./types";
import { Login } from "./components/Login";
import { AdminDashboard } from "./components/AdminDashboard";
import { TechnicianDashboard } from "./components/TechnicianDashboard";
import { CustomerDashboard } from "./components/CustomerDashboard";
import { getActiveSession, clearActiveSession, saveUser, initSeedData } from "./lib/db";
import { ShieldAlert, KeyRound, Check } from "lucide-react";
import { Logo } from "./components/Logo";
import { SplashLoader } from "./components/SplashLoader";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ganti Password Default State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errorPwd, setErrorPwd] = useState("");

  useEffect(() => {
    // Initialize standard seed data for 58 outlets & default users
    initSeedData();
    
    // Check for persisted active session on reload
    const active = getActiveSession();
    if (active) {
      setUser(active);
    }
  }, []);

  const handleLogout = () => {
    clearActiveSession();
    setUser(null);
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPwd("");

    if (!newPassword) {
      setErrorPwd("Password baru tidak boleh kosong!");
      return;
    }

    if (newPassword === user?.username) {
      setErrorPwd("Password baru tidak boleh sama dengan username (bawaan)!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorPwd("Konfirmasi password tidak cocok!");
      return;
    }

    if (user) {
      setIsChangingPassword(true);
      try {
        const updatedUser: User = {
          ...user,
          passwordHash: newPassword.trim(),
          isDefaultPassword: false
        };

        // Save in database
        await saveUser(updatedUser);
        
        // Update local session
        localStorage.setItem("atn_active_session", JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        alert("Password berhasil diperbarui! Selamat datang di sistem CV ATN.");
      } catch (err) {
        setErrorPwd("Gagal menyimpan password baru. Silakan coba lagi.");
      } finally {
        setIsChangingPassword(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <SplashLoader key="loader" onComplete={() => setIsLoading(false)} />
        ) : (
          <motion.div
            key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen"
          >
            {/* 1. Unauthenticated State -> Show Glassmorphic Login */}
            {!user ? (
              <Login onLoginSuccess={(u) => {
                localStorage.setItem("atn_active_session", JSON.stringify(u));
                setUser(u);
              }} />
            ) : user.isDefaultPassword ? (
              /* 2. Forced Default Password Change workflow (User Checklist requirement) */
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl space-y-6 text-white text-left relative overflow-hidden">
                  
                  {/* Logo element */}
                  <div className="flex flex-col items-center text-center space-y-2 border-b border-white/10 pb-4">
                    <Logo size={60} showText={false} />
                    <h2 className="text-sm font-extrabold uppercase tracking-widest text-red-500">
                      Wajib Ganti Password
                    </h2>
                    <p className="text-[11px] text-slate-300">
                      Akun Anda menggunakan password bawaan. Demi keamanan data CV Athariz Technology Noesantara, harap perbarui password Anda sebelum masuk.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                    {errorPwd && (
                      <div className="bg-red-500/20 border border-red-500/40 p-3 rounded-lg flex items-start gap-2 text-xs text-red-200">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorPwd}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-red-500" /> Password Baru
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Masukkan password baru Anda"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/15 focus:border-red-500 rounded-xl text-xs text-white outline-none transition-all placeholder:text-slate-500 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-red-500" /> Konfirmasi Password Baru
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang password baru Anda"
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/15 focus:border-red-500 rounded-xl text-xs text-white outline-none transition-all placeholder:text-slate-500 font-bold"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all shadow-lg shadow-red-700/25 flex items-center justify-center gap-1.5"
                      >
                        {isChangingPassword ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" /> Simpan & Lanjutkan
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Cancel Logout Option */}
                  <div className="text-center pt-2">
                    <button
                      onClick={handleLogout}
                      className="text-[10px] text-slate-400 hover:text-red-500 hover:underline font-semibold"
                    >
                      Keluar Sesi & Batal
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              /* 3. Authenticated Dashboard Routing based on User Roles */
              <div className="min-h-screen">
                {(user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) && (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                )}
                {user.role === UserRole.TECHNICIAN && (
                  <TechnicianDashboard user={user} onLogout={handleLogout} />
                )}
                {user.role === UserRole.CUSTOMER && (
                  <CustomerDashboard user={user} onLogout={handleLogout} />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
