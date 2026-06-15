import React, { useRef, useState, useEffect } from 'react';
import { SquarePen, Trash2, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resizing for crisp lines based on physical pixels (devicePixelRatio)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#020617'; // slate-950
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      const mouseEvent = e as MouseEvent | React.MouseEvent;
      return {
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // We can pull the base64 png
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SquarePen className="w-5 h-5 text-indigo-600" />
          <h4 className="font-semibold text-slate-800 text-base">Assinatura Digital</h4>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 rounded"
        >
          Cancelar
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        Assine na área demarcada abaixo para confirmar o recebimento do pedido em mãos.
      </p>

      {/* Signature Area */}
      <div className="relative border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl overflow-hidden h-40 group">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />
        
        {/* Helper Line and label */}
        {!hasDrawn && (
          <div className="absolute inset-x-4 bottom-8 flex flex-col items-center justify-center pointer-events-none select-none">
            <div className="w-full border-t border-slate-300"></div>
            <span className="text-[10px] text-slate-400 tracking-wider font-mono mt-2 uppercase">Assine sobre esta linha</span>
          </div>
        )}
      </div>

      {/* Control Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={clearCanvas}
          disabled={!hasDrawn}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpar
        </button>

        <button
          onClick={saveSignature}
          disabled={!hasDrawn}
          className="flex-2 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-frz-primary hover:bg-frz-primary-hover text-white text-xs font-black transition disabled:opacity-50 shadow-sm"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          Confirmar e Salvar
        </button>
      </div>
    </div>
  );
}
