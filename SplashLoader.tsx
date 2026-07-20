import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Logo } from "./Logo";

interface SplashLoaderProps {
  onComplete: () => void;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Elegant incremental progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 350); // Small pause at 100% for transition
          return 100;
        }
        const diff = Math.random() * 15 + 5;
        return Math.min(prev + diff, 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0f12]/95 overflow-hidden backdrop-blur-xl"
    >
      {/* Decorative Elegant Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#C52328]/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-red-600/5 rounded-full filter blur-[80px] pointer-events-none" />

      {/* Main Logo Card Container */}
      <div className="relative flex flex-col items-center text-center p-8 max-w-sm w-full select-none z-10">
        {/* Animated Outer Glowing Ring */}
        <div className="relative mb-8 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute inset-0 -m-4 border border-white/5 rounded-full bg-white/[0.01]"
          />
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.1,
            }}
            className="absolute inset-0 -m-8 border border-red-500/10 rounded-full"
          />

          {/* Central Logo Box with float and subtle zoom */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: [0.9, 1.02, 1],
              opacity: 1,
              y: [0, -4, 0]
            }}
            transition={{
              scale: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.9, ease: "easeOut" },
              y: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl relative"
          >
            <Logo size={100} showText={false} />
          </motion.div>
        </div>

        {/* Text Details & Progress Indicators */}
        <div className="space-y-4 w-full">
          {/* Main Title with Letter Spacing */}
          <div className="space-y-1">
            <motion.h1
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="text-xs font-black tracking-[0.2em] text-red-500 uppercase"
            >
              CV. ATHARIZ TECHNOLOGY
            </motion.h1>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              className="text-[10px] font-bold text-slate-400 tracking-[0.35em] uppercase font-mono"
            >
              N O E S A N T A R A
            </motion.p>
          </div>

          {/* Elegant Slim Loading Bar */}
          <div className="w-48 mx-auto space-y-2 pt-2">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_12px_rgba(197,35,40,0.6)]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeInOut" }}
              />
            </div>
            <div className="flex justify-between items-center text-[8px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              <span>Initializing</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
