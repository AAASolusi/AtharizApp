import React from "react";
import { Jobcard } from "../types";

// Dynamic Indonesian "Terbilang" spelling generator
export function terbilang(angka: number): string {
  const bil = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (angka < 12) {
    return bil[angka];
  } else if (angka < 20) {
    return bil[angka - 10] + " belas";
  } else if (angka < 100) {
    return bil[Math.floor(angka / 10)] + " puluh " + bil[angka % 10];
  } else if (angka < 200) {
    return "seratus " + terbilang(angka - 100);
  } else if (angka < 1000) {
    return bil[Math.floor(angka / 100)] + " ratus " + terbilang(angka % 100);
  } else if (angka < 2000) {
    return "seribu " + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    return terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
  } else if (angka < 1000000000) {
    return terbilang(Math.floor(angka / 1000000)) + " juta " + terbilang(angka % 1000000);
  }
  return "";
}

export function formatTerbilangRupiah(amount: number): string {
  if (amount === 0) return "nol rupiah";
  const text = terbilang(amount);
  // Capitalize first letter of each major word to match "satu Juta Sembilan ratus lima puluh ribu rupiah"
  return text
    .split(" ")
    .map((word, i) => {
      if (word === "juta" || word === "ribu") {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ") + " rupiah";
}

export const formatRupiah = (amount?: number): string => {
  if (amount === undefined) return "Rp, -";
  return `Rp, ${amount.toLocaleString("en-US")},-`;
};

// --- LOGO VECTOR SVG FOR PDF ---
const PDFLogo: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <div className="flex items-center gap-3">
    <img
      src="/logo.png"
      alt="ATN Logo"
      width={size}
      height={size}
      className="shrink-0 object-contain rounded"
      referrerPolicy="no-referrer"
    />
    <div className="flex flex-col text-left">
      <span className="text-[13px] font-extrabold tracking-wide text-red-600 font-sans leading-none">
        CV. ATHARIZ TECHNOLOGY
      </span>
      <span className="text-[9px] font-bold tracking-[0.25em] text-slate-800 font-mono mt-0.5">
        ATHARIZ TECHNOLOGY NOESANTARA
      </span>
    </div>
  </div>
);

// --- 1. LAMPIRAN PENGERJAAN PDF TEMPLATE ---
// Formatted for A4 proportions (Width: 794px, Height: 1123px)
interface LampiranTemplateProps {
  jobcard: Jobcard;
  page?: number; // kept for backwards compatibility
}

export const LampiranPDFTemplate: React.FC<LampiranTemplateProps> = ({ jobcard }) => {
  const allPhotos = jobcard.photos || [];
  
  // Fit up to 8 photos on a single page in 3 columns
  const pagePhotos = allPhotos.slice(0, 8);

  return (
    <div 
      id="lampiran-page-1" 
      className="w-[794px] h-[1123px] bg-white text-slate-900 p-[30px] flex flex-col justify-between font-sans shadow-lg select-none relative box-border"
      style={{ minWidth: "794px", maxWidth: "794px", minHeight: "1123px", maxHeight: "1123px" }}
    >
      {/* Decorative Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-red-800" />

      {/* Large Subtle Watermark Logo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.045] select-none z-0">
        <div className="flex flex-col items-center justify-center transform rotate-[-12deg] filter grayscale contrast-125">
          <img
            src="/logo.png"
            alt="Watermark Logo"
            className="w-80 h-80 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="mt-4 flex flex-col items-center text-center">
            <span className="text-xl font-black tracking-[0.25em] text-slate-900 uppercase leading-none">
              CV. ATHARIZ TECHNOLOGY
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.45em] text-slate-800 uppercase font-mono leading-none mt-2">
              N O E S A N T A R A
            </span>
          </div>
        </div>
      </div>

      <div>
        {/* Header Block */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-3">
          <div className="flex flex-col items-start text-left">
            <PDFLogo size={40} />
            <div className="text-[9px] text-slate-600 font-medium font-sans mt-1.5 leading-relaxed">
              Jl. Griya Brandweer Blok A10 no. 8<br />
              Parung Bogor Jawa barat 16330<br />
              Email : <span className="text-red-600 underline">Athariztechnology@gmail.com</span>
            </div>
          </div>
          
          {/* Document Type Label Block */}
          <div className="border border-slate-400 bg-white shadow-sm rounded overflow-hidden min-w-[180px]">
            <div className="bg-slate-50 border-b border-slate-300 text-center py-1 px-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-800 uppercase">
                LAMPIRAN PENGERJAAN
              </span>
            </div>
            <div className="text-center py-1 px-2">
              <span className="text-[10px] font-mono font-bold text-red-600">
                No. {jobcard.noJobcard || "26041610"}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Job details Metadata Box */}
        <div className="grid grid-cols-12 border border-slate-300 rounded overflow-hidden mt-3 text-[10px]">
          {/* Left Column */}
          <div className="col-span-7 border-r border-slate-300 p-2.5 bg-slate-50/50 flex flex-col justify-start gap-1">
            <div className="flex gap-1.5">
              <span className="font-bold text-slate-700 w-16 text-left">Customer :</span>
              <div className="flex-1 text-slate-900 font-bold uppercase text-left">
                {jobcard.customerName || "BNI CIOMAS"}
              </div>
            </div>
            <div className="flex gap-1.5 mt-0.5">
              <span className="font-bold text-slate-700 w-16 text-left">Alamat :</span>
              <div className="flex-1 text-slate-600 leading-normal font-medium text-left">
                {jobcard.customerAddress || "Jl. Raya Laladon Ciomas Rahayu, Kec. Ciomas, Kabupaten Bogor, Jawa Barat 16610"}
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="col-span-5 p-2.5 flex flex-col justify-start gap-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Tgl Pengerjaan</span>
              <span className="font-semibold text-slate-900">: {jobcard.tglPengerjaan || "16 April 2026"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">No. Lampiran</span>
              <span className="font-semibold text-red-600 font-mono">: {jobcard.noJobcard || "26041610"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Teknisi</span>
              <span className="font-semibold text-slate-900 capitalize">: {jobcard.teknisiName || "wahyono"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Hp</span>
              <span className="font-semibold text-slate-900 font-mono">: {jobcard.teknisiPhone || "+6281574757617"}</span>
            </div>
          </div>
        </div>

        {/* Title area for photos */}
        <div className="mt-4 mb-2 text-left flex justify-between items-baseline">
          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b-2 border-red-600 pb-0.5">
            Foto Lampiran Pengerjaan (Maksimal 8 Foto)
          </span>
          <span className="text-[9px] text-slate-500 font-mono">
            Total: {pagePhotos.length} foto
          </span>
        </div>

        {/* Photos Grid - 3 columns, auto-flowing rows */}
        <div className="grid grid-cols-3 gap-2.5">
          {pagePhotos.map((photo, index) => {
            const photoNum = index + 1;
            return (
              <div key={index} className="flex flex-col bg-slate-50 border border-slate-200 rounded-lg p-1.5 shadow-sm">
                <div className="relative w-full h-[140px] bg-slate-900 rounded overflow-hidden flex items-center justify-center">
                  <img
                    src={photo}
                    alt={`Bukti PM ${photoNum}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {/* Watermark */}
                  <div className="absolute bottom-1 right-1 bg-black/65 text-white text-[7px] font-mono px-1 py-0.5 rounded tracking-wider uppercase">
                    CV. ATN • BNI PM
                  </div>
                </div>
                <div className="text-center mt-1">
                  <span className="text-[9px] font-semibold text-slate-700">
                    Foto Bukti {photoNum}
                  </span>
                </div>
              </div>
            );
          })}
          {/* Fill empty cells to preserve layout if photos = 0 */}
          {pagePhotos.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-300 text-[10px] font-mono border border-dashed border-slate-200 rounded-lg">
              Belum ada foto lampiran pengerjaan.
            </div>
          )}
        </div>
      </div>

      {/* Footer Block with Stamp and Sign */}
      <div className="flex justify-between items-end border-t border-slate-200 pt-2.5 mt-3">
        <span className="text-[8.5px] text-slate-400 font-mono">
          Dokumen ini dibuat otomatis & sah oleh Sistem Jobcard CV. ATN
        </span>
        
        {/* Signature Box */}
        <div className="flex gap-4 items-end">
          <div className="text-center">
            <span className="text-[8.5px] text-slate-500 uppercase block tracking-wider mb-0.5 font-semibold">
              Teknisi Lapangan,
            </span>
            <div className="h-14 w-32 flex items-center justify-center border border-slate-200 rounded bg-slate-50/50">
              {jobcard.signatureBase64 ? (
                <img src={jobcard.signatureBase64} alt="Technician Sign" className="max-h-full object-contain" />
              ) : (
                <span className="text-[8.5px] text-slate-300 font-mono">(Belum TTD)</span>
              )}
            </div>
            <span className="text-[9.5px] font-bold text-slate-700 capitalize block mt-1">
              {jobcard.teknisiName || "wahyono"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- 2. INVOICE PDF TEMPLATE ---
// Formatted for A4 proportions (Width: 794px, Height: 1123px)
interface InvoiceTemplateProps {
  jobcard: Jobcard;
}

export const InvoicePDFTemplate: React.FC<InvoiceTemplateProps> = ({ jobcard }) => {
  const machines = jobcard.machines || [];
  const invoiceDateText = jobcard.invoiceDate || "April 2026";
  const authName = jobcard.adminSignatureName || "Agung Setiawan";

  return (
    <div 
      id="invoice-page" 
      className="w-[794px] h-[1123px] bg-white text-slate-900 p-[40px] flex flex-col justify-between font-sans shadow-lg select-none relative box-border"
      style={{ minWidth: "794px", maxWidth: "794px", minHeight: "1123px", maxHeight: "1123px" }}
    >
      {/* Decorative Top Border */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-red-800" />

      {/* Large Subtle Watermark Logo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.05] select-none z-0">
        <div className="flex flex-col items-center justify-center transform rotate-[-12deg] filter grayscale contrast-125">
          <img
            src="/logo.png"
            alt="Watermark Logo"
            className="w-80 h-80 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="mt-4 flex flex-col items-center text-center">
            <span className="text-xl font-black tracking-[0.25em] text-slate-900 uppercase leading-none">
              CV. ATHARIZ TECHNOLOGY
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.45em] text-slate-800 uppercase font-mono leading-none mt-2">
              N O E S A N T A R A
            </span>
          </div>
        </div>
      </div>

      <div>
        {/* Header Block */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4">
          <div className="flex flex-col items-start text-left">
            <PDFLogo size={48} />
            <div className="text-[10px] text-slate-600 font-medium font-sans mt-2.5 leading-relaxed">
              Jl. Griya Brandweer Blok A10 no. 8<br />
              Parung Bogor Jawa barat 16330<br />
              Email : <span className="text-red-600 underline">Athariztechnology@gmail.com</span>
            </div>
          </div>
          
          {/* Invoice Label Block */}
          <div className="border border-slate-400 bg-white shadow-sm rounded overflow-hidden min-w-[200px]">
            <div className="bg-slate-50 border-b border-slate-300 text-center py-1.5 px-3">
              <span className="text-[11px] font-bold tracking-widest text-slate-800 uppercase">
                INVOICE
              </span>
            </div>
            <div className="text-center py-1.5 px-3">
              <span className="text-[11px] font-mono font-bold text-red-600">
                No. {jobcard.noJobcard || "26041610"}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Job details Metadata Box */}
        <div className="grid grid-cols-12 border border-slate-300 rounded overflow-hidden mt-5 text-[10.5px]">
          {/* Left Column */}
          <div className="col-span-7 border-r border-slate-300 p-3 bg-slate-50/50 flex flex-col justify-start gap-1">
            <div className="flex gap-1.5">
              <span className="font-bold text-slate-700 w-16">Customer :</span>
              <div className="flex-1 text-slate-900 font-bold uppercase">
                {jobcard.customerName || "BNI CIOMAS"}
              </div>
            </div>
            <div className="flex gap-1.5 mt-1">
              <span className="font-bold text-slate-700 w-16">Alamat :</span>
              <div className="flex-1 text-slate-600 leading-relaxed font-medium">
                {jobcard.customerAddress || "Jl. Raya Laladon Ciomas Rahayu, Kec. Ciomas, Kabupaten Bogor, Jawa Barat 16610"}
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="col-span-5 p-3 flex flex-col justify-start gap-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Tgl Pengerjaan</span>
              <span className="font-semibold text-slate-900">: {jobcard.tglPengerjaan || "16 April 2026"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">No. Invoice</span>
              <span className="font-semibold text-red-600 font-mono">: {jobcard.noJobcard || "26041610"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Teknisi</span>
              <span className="font-semibold text-slate-900 capitalize">: {jobcard.teknisiName || "wahyono"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Hp</span>
              <span className="font-semibold text-slate-900 font-mono">: {jobcard.teknisiPhone || "+6281574757617"}</span>
            </div>
          </div>
        </div>

        {/* Invoice Itemized Table */}
        <div className="mt-5 border border-slate-300 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center border-r border-sky-500">No.</th>
                <th className="py-2.5 px-3 border-r border-sky-500">MESIN</th>
                <th className="py-2.5 px-3 border-r border-sky-500">Type</th>
                <th className="py-2.5 px-3 border-r border-sky-500">Serial number</th>
                <th className="py-2.5 px-3 border-r border-sky-500">KETERANGAN</th>
                <th className="py-2.5 px-3 w-32 text-right">HARGA</th>
              </tr>
            </thead>
            <tbody className="text-[10px] divide-y divide-slate-200">
              {machines.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50 transition-all font-medium">
                  <td className="py-2 px-3 text-center text-slate-500 border-r border-slate-200">{index + 1}.</td>
                  <td className="py-2 px-3 text-slate-900 border-r border-slate-200">{item.mesin}</td>
                  <td className="py-2 px-3 text-slate-700 border-r border-slate-200">{item.type}</td>
                  <td className="py-2 px-3 text-slate-800 font-mono border-r border-slate-200">{item.serialNumber}</td>
                  <td className="py-2 px-3 text-slate-600 border-r border-slate-200">{item.keterangan}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {formatRupiah(item.harga)}
                  </td>
                </tr>
              ))}
              {/* Padding rows if list is very short, to keep visual consistency */}
              {machines.length < 5 && Array.from({ length: 5 - machines.length }).map((_, i) => (
                <tr key={`pad-${i}`} className="h-6 opacity-30">
                  <td className="py-2 px-3 text-center border-r border-slate-200">-</td>
                  <td className="py-2 px-3 border-r border-slate-200">-</td>
                  <td className="py-2 px-3 border-r border-slate-200">-</td>
                  <td className="py-2 px-3 border-r border-slate-200">-</td>
                  <td className="py-2 px-3 border-r border-slate-200">-</td>
                  <td className="py-2 px-3 text-right">-</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-slate-100 font-extrabold text-[10.5px]">
                <td colSpan={5} className="py-2.5 px-3 text-right text-sky-700 uppercase tracking-widest border-r border-slate-300">
                  TOTAL
                </td>
                <td className="py-2.5 px-3 text-right text-red-600 font-extrabold text-[11px] font-mono">
                  {formatRupiah(jobcard.invoiceTotal || machines.reduce((s, m) => s + (m.harga || 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Invoice Footer Details (Terms, Bank Details) */}
        <div className="grid grid-cols-12 gap-5 mt-6 text-[10px]">
          {/* Left Details */}
          <div className="col-span-7 flex flex-col gap-1 text-left leading-relaxed">
            <p className="font-semibold text-slate-700">
              Garansi Service 1 Bulan diluar sparepart
            </p>
            <p className="text-slate-600 italic bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 mt-1">
              <span className="font-bold text-slate-700 block text-[9.5px] not-italic mb-0.5">Terbilang :</span>
              {formatTerbilangRupiah(jobcard.invoiceTotal || machines.reduce((s, m) => s + (m.harga || 0), 0))}
            </p>
            <div className="mt-2.5 text-slate-600">
              <span className="font-bold text-slate-700 block mb-0.5 uppercase tracking-wide">Info Pembayaran:</span>
              <table className="w-full text-slate-700 font-medium">
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-2 w-16 text-slate-500 font-normal">NPWP</td>
                    <td className="py-0.5">: 21.462.399.3-403.000</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-slate-500 font-normal">REK</td>
                    <td className="py-0.5">: 1911975067</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-slate-500 font-normal">BNI</td>
                    <td className="py-0.5 font-bold text-slate-800">: CV ATHARIZ TECHNOLOGY NOESANTARA</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-2 text-slate-500 font-normal">CABANG</td>
                    <td className="py-0.5">: BNI KC BOGOR</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Signature Area */}
          <div className="col-span-5 flex flex-col justify-between items-center text-center">
            <div>
              <span className="text-slate-700 font-bold block mb-1 font-sans">
                Bogor, {invoiceDateText}
              </span>
              <span className="text-[9.5px] text-slate-500 uppercase block tracking-wider font-semibold">
                Hormat Kami,
              </span>
              <span className="text-[9px] text-red-600 font-extrabold uppercase block font-sans leading-tight mt-0.5">
                CV. ATHARIZ TECHNOLOGY NOESANTARA
              </span>
            </div>

            {/* Stamp and Signature Space */}
            <div className="relative w-36 h-20 border border-dashed border-slate-200 bg-slate-50/30 rounded flex items-center justify-center my-2">
              {/* Optional Admin Signature */}
              {jobcard.adminSignatureBase64 ? (
                <img src={jobcard.adminSignatureBase64} alt="Admin Sign" className="max-h-full object-contain relative z-10" />
              ) : (
                <span className="text-[9px] text-slate-300 font-mono z-10">(Belum TTD)</span>
              )}

              {/* CV ATN Official Watermark Stamp overlay to match exact screenshot */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.14] select-none scale-75">
                <div className="border-[3px] border-red-600 rounded-full w-16 h-16 flex flex-col items-center justify-center text-[7px] font-bold text-red-600 uppercase tracking-widest">
                  <span>CV. ATN</span>
                  <span className="text-[5px]">LUNAS</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10.5px] font-extrabold text-slate-800 block underline leading-none">
                {authName}
              </span>
              <span className="text-[8.5px] text-slate-400 block tracking-wider mt-0.5 font-semibold">
                Authorized Signature
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Tiny ID */}
      <div className="border-t border-slate-200 pt-2 flex justify-between text-[8px] text-slate-400 font-mono">
        <span>No. Seri Invoice: ATN-INV-{jobcard.noJobcard || "26041610"}</span>
        <span>Sistem Invoicing CV. Athariz Technology Noesantara</span>
      </div>
    </div>
  );
};
