import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ScanPage() {
  const [, navigate] = useLocation();
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  async function lookupBarcode(barcode: string) {
    try {
      const res = await fetch(`/api/pantry/external-barcode/${barcode}`);
      const product = await res.json();
      if (product) {
        toast.success(`Found: ${product.name}`);
      } else {
        toast.info('Product not found — add it manually');
      }
      navigate('/pantry');
    } catch {
      toast.error('Lookup failed');
    }
  }

  useEffect(() => {
    let scanner: { clear: () => void } | null = null;
    if (scanning && videoRef.current) {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        const s = new Html5QrcodeScanner('barcode-scanner', { fps: 10, qrbox: 250 }, false);
        s.render(
          (decoded: string) => {
            s.clear();
            setScanning(false);
            lookupBarcode(decoded);
          },
          () => {}
        );
        scanner = s;
      });
    }
    return () => { scanner?.clear(); };
  }, [scanning]);

  return (
    <Layout>
      <div className="p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => navigate('/pantry')}>← Back</Button>
          <h1 className="text-2xl font-black">Scan Barcode</h1>
        </div>

        {!scanning ? (
          <div className="text-center space-y-6">
            <div className="text-6xl">📷</div>
            <p className="text-[var(--muted-foreground)]">Point your camera at any product barcode to look it up automatically.</p>
            <Button className="w-full" size="lg" onClick={() => setScanning(true)}>
              Start Camera
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-[var(--background)] px-2 text-[var(--muted-foreground)]">or enter manually</span></div>
            </div>
            <div className="space-y-2">
              <Label>Barcode number</Label>
              <div className="flex gap-2">
                <Input value={manualBarcode} onChange={e => setManualBarcode(e.target.value)} placeholder="e.g. 012345678901" />
                <Button disabled={!manualBarcode} onClick={() => lookupBarcode(manualBarcode)}>Look Up</Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div id="barcode-scanner" ref={videoRef} className="rounded-xl overflow-hidden" />
            <Button variant="outline" className="w-full mt-4" onClick={() => setScanning(false)}>Cancel</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
