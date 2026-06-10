import { QrCode, ExternalLink } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  onOpenSimulator: () => void;
}

export default function QRCodeGenerator({ value, size = 120, onOpenSimulator }: QRCodeGeneratorProps) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

  // A clean, beautiful visual representation of a real, scanner-scannable QR code
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="relative group cursor-pointer" onClick={onOpenSimulator} title="Clique para simular leitura de QR Code">
        {/* Real QR Code Image with elegant styling */}
        <div 
          className="bg-slate-50 p-3 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-slate-100/50 transition duration-300"
          style={{ width: size + 24, height: size + 24 }}
        >
          <img
            src={qrCodeUrl}
            alt="Real Scanner-Scannable QR Code"
            width={size}
            height={size}
            referrerPolicy="no-referrer"
            className="rounded-lg object-contain"
            onError={(e) => {
              // Fallback to stylized SVG lock symbol if QR offline
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Hover Simulator Trigger indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300">
          <span className="bg-slate-900 text-white text-[10px] uppercase font-bold py-1 px-2.5 rounded-full flex items-center gap-1.5 shadow-md">
            <ExternalLink className="w-3 h-3" />
            Simular Celular
          </span>
        </div>
      </div>

      <button
        onClick={onOpenSimulator}
        className="mt-3 text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
      >
        <QrCode className="w-3.5 h-3.5" />
        Escaneie para Abrir no Smartphone
      </button>
    </div>
  );
}
