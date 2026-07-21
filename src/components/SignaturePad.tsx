import React, { useRef, useState, useEffect } from "react";
import { Trash2, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  onSave: (base64Data: string) => void;
  onCancel?: () => void;
  savedSignature?: string;
  placeholderName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onCancel,
  savedSignature,
  placeholderName = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Ensure canvas resolution matches its display size on mobile
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 400;
      canvas.height = rect.height || 128;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = "#C52328"; // Premium red ink for CV ATN
        ctx.lineWidth = 3;
      }
    }
  }, [savedSignature]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Check if touch or mouse
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider">
          <PenTool className="w-3.5 h-3.5 text-red-600" />
          Tanda Tangan Digital ({placeholderName})
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded font-semibold hover:bg-gray-300 transition-all flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Bersihkan
        </button>
      </div>

      <div className="relative border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white h-32 w-full flex items-center justify-center">
        {savedSignature ? (
          <img src={savedSignature} alt="Signature Preview" className="max-h-full object-contain pointer-events-none" />
        ) : (
          <canvas
            ref={canvasRef}
            width={400}
            height={128}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          />
        )}
        {!hasDrawn && !savedSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs">
            Goreskan tanda tangan Anda di sini
          </div>
        )}
      </div>

      {!savedSignature && (
        <div className="flex justify-end gap-2 mt-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              Batal
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
              hasDrawn
                ? "bg-red-600 text-white hover:bg-red-700 shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Check className="w-3.5 h-3.5" /> Terapkan TTD
          </button>
        </div>
      )}
    </div>
  );
};
