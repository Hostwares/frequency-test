import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ScanLine, X } from 'lucide-react';
import { toast } from 'sonner';

export default function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator.mediaDevices;
    setSupported(ok);
  }, []);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const value = codes[0].rawValue;
            if (value) {
              stop();
              toast.success('QR code scanned');
              if (onScan) onScan(value);
              return;
            }
          }
        } catch { /* not fatal */ }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setError('Could not access camera. Please grant camera permission and try again.');
      setScanning(false);
    }
  };

  if (!supported) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        QR scanning isn't supported in this browser. Use a device with camera access and an updated browser.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-black border border-border/40">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <Camera className="w-8 h-8 mx-auto mb-2" />
              <p>Tap Start to scan a QR code</p>
            </div>
          </div>
        )}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-2/3 h-2/3 border-2 border-neon-cyan rounded-xl" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        {!scanning ? (
          <Button size="sm" onClick={start}><ScanLine className="w-4 h-4 mr-1.5" /> Start Scanning</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={stop}><X className="w-4 h-4 mr-1.5" /> Stop</Button>
        )}
        {onClose && <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}