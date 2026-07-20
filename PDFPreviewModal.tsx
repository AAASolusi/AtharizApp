import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { X, Download, FileText, Loader2, Eye } from "lucide-react";
import { Jobcard } from "../types";
import { LampiranPDFTemplate, InvoicePDFTemplate } from "./PDFTemplates";

// Convert OKLCH to RGB values
const oklchToRgb = (l: number, c: number, h: number): [number, number, number] => {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  
  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;
  
  let r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let b_val = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;
  
  const transfer = (v: number) => {
    return v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v;
  };
  
  r = transfer(r);
  g = transfer(g);
  b_val = transfer(b_val);
  
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return [clamp(r), clamp(g), clamp(b_val)];
};

// Convert OKLAB to RGB values
const oklabToRgb = (l: number, a: number, b: number): [number, number, number] => {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  
  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;
  
  let r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let b_val = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;
  
  const transfer = (v: number) => {
    return v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v;
  };
  
  r = transfer(r);
  g = transfer(g);
  b_val = transfer(b_val);
  
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return [clamp(r), clamp(g), clamp(b_val)];
};

// Regex to find and replace any oklch() or oklab() color occurrences with rgb/rgba
const convertOklchStringToRgb = (str: string): string => {
  if (!str || typeof str !== "string") return str;
  
  let result = str;

  if (result.includes("oklch(")) {
    const regexOklch = /oklch\(\s*([\d.]+%?)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[\/,\s]\s*([\d.]+%?))?\s*\)/gi;
    result = result.replace(regexOklch, (match, lStr, cStr, hStr, aStr) => {
      try {
        let l = parseFloat(lStr);
        if (lStr.includes("%")) l /= 100;
        const c = parseFloat(cStr);
        const h = parseFloat(hStr);
        const [r, g, b] = oklchToRgb(l, c, h);
        if (aStr) {
          let a = parseFloat(aStr);
          if (aStr.includes("%")) a /= 100;
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        return `rgb(${r}, ${g}, ${b})`;
      } catch (e) {
        return "rgb(128, 128, 128)";
      }
    });
  }

  if (result.includes("oklab(")) {
    const regexOklab = /oklab\(\s*([\d.]+%?)[,\s]+([-\d.]+)[,\s]+([-\d.]+)(?:\s*[\/,\s]\s*([\d.]+%?))?\s*\)/gi;
    result = result.replace(regexOklab, (match, lStr, aStrValue, bStrValue, alphaStr) => {
      try {
        let l = parseFloat(lStr);
        if (lStr.includes("%")) l /= 100;
        const aVal = parseFloat(aStrValue);
        const bVal = parseFloat(bStrValue);
        const [r, g, b] = oklabToRgb(l, aVal, bVal);
        if (alphaStr) {
          let a = parseFloat(alphaStr);
          if (alphaStr.includes("%")) a /= 100;
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        return `rgb(${r}, ${g}, ${b})`;
      } catch (e) {
        return "rgb(128, 128, 128)";
      }
    });
  }

  return result;
};

interface PDFPreviewModalProps {
  jobcard: Jobcard;
  type: "lampiran" | "invoice";
  onClose: () => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  jobcard,
  type,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.clientWidth;
        const targetWidth = 794 + 32; // 794 template + padding (32px)
        const newScale = parentWidth < targetWidth ? parentWidth / targetWidth : 1;
        setScale(newScale);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  const handleDownload = async () => {
    setIsGenerating(true);

    // Temporarily reset scale to 1 to ensure html2canvas captures at full 100% resolution
    const prevScale = scale;
    setScale(1);

    // Wait for the state update and DOM to settle
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Save the original getComputedStyle
    const originalGetComputedStyle = window.getComputedStyle;

    // Temporary patch to convert oklch values on the fly to prevent html2canvas crashes
    window.getComputedStyle = function(el, pseudoElt) {
      const style = originalGetComputedStyle(el, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          const val = Reflect.get(target, prop);
          if (typeof val === "function") {
            if (prop === "getPropertyValue") {
              return function(key: string) {
                const originalVal = target.getPropertyValue(key);
                return convertOklchStringToRgb(originalVal);
              };
            }
            return val.bind(target);
          }
          if (typeof val === "string") {
            return convertOklchStringToRgb(val);
          }
          return val;
        }
      }) as any;
    };

    try {
      const pdf = new jsPDF("p", "mm", "a4"); // Standard A4 dimensions
      const customerSafe = (jobcard.customerName || "Customer").replace(/[^a-zA-Z0-9]/g, "_");
      const jobcardNo = jobcard.noJobcard || "26041610";

      if (type === "lampiran") {
        // Single A4 page rendering for up to 8 photos
        const p1 = document.getElementById("lampiran-page-1");
        if (p1) {
          const canvas1 = await html2canvas(p1, { 
            scale: 2, 
            useCORS: true,
            logging: false,
            windowWidth: 794,
            windowHeight: 1123
          });
          const img1 = canvas1.toDataURL("image/jpeg", 0.95);
          pdf.addImage(img1, "JPEG", 0, 0, 210, 297);
        }

        pdf.save(`PM ${jobcard.customerName || "BNI Ciomas"}-1.pdf`);
      } else {
        // Invoice page rendering (always 1 page)
        const element = document.getElementById("invoice-page");
        if (element) {
          const canvas = await html2canvas(element, { 
            scale: 2, 
            useCORS: true,
            logging: false,
            windowWidth: 794,
            windowHeight: 1123
          });
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        }

        pdf.save(`PM ${jobcard.customerName || "BNI Ciomas"}-2.pdf`);
      }
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Terjadi kesalahan saat mengekspor PDF. Silakan coba kembali.");
    } finally {
      // Restore getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;
      setScale(prevScale);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-[860px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-4">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center bg-slate-900 text-white px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Pratinjau {type === "lampiran" ? "Lampiran Pengerjaan" : "Invoice Resmi"}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                No. Jobcard: {jobcard.noJobcard} • {jobcard.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable PDF Preview Container */}
        <div className="flex-1 overflow-auto bg-slate-100 p-3 sm:p-6 flex flex-col items-center gap-4 sm:gap-8">
          
          <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-xs w-full max-w-[794px] text-left flex items-start gap-2.5">
            <Eye className="w-4 h-4 shrink-0 mt-0.5 text-orange-600" />
            <div>
              <span className="font-bold">Mode Pratinjau Lembar A4</span>
              <p className="mt-0.5 text-orange-700">
                Tampilan di bawah adalah render presisi ukuran kertas A4. Hasil download PDF akan sama persis dengan yang terlihat di pratinjau ini.
              </p>
            </div>
          </div>

          {/* Render target elements that html2canvas will capture */}
          <div ref={containerRef} className="w-full flex justify-center py-2 overflow-hidden">
            <div 
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                width: `${794 + 32}px`,
                height: `${(1123 + 32) * scale}px`,
                transition: "transform 0.15s ease-out, height 0.15s ease-out"
              }}
              className="shadow-2xl rounded-lg overflow-hidden border border-slate-200 shrink-0"
            >
              {type === "lampiran" ? (
                <div className="bg-slate-300 p-4">
                  <LampiranPDFTemplate jobcard={jobcard} />
                </div>
              ) : (
                <div className="bg-slate-300 p-4">
                  <InvoicePDFTemplate jobcard={jobcard} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Action Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
          >
            Tutup Pratinjau
          </button>
          
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold text-sm rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-700/10 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengekspor PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Unduh PDF Resmi
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
