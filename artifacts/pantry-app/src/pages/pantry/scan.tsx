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
    let scanner: { clear: () => Promise<void> } | null = null;
    // Declared here so the cleanup return can reach it even though
    // the assignment happens inside the async .then() below.
    let observer: MutationObserver | null = null;
    if (scanning && videoRef.current) {
      import('html5-qrcode').then(({ Html5QrcodeScanner, Html5QrcodeSupportedFormats }) => {
        const s = new Html5QrcodeScanner(
          'barcode-scanner',
          {
            fps: 10,
            // Wide+short, not square — UPC/EAN barcodes are horizontal
            // stripes. A square box (the old `qrbox: 250`) crops the
            // left/right edges off the barcode before the decoder ever
            // sees a complete symbol, independent of resolution.
            qrbox: { width: 300, height: 150 },
            // Narrow the decoder to retail formats only. Without this it
            // searches every format (QR, all 1D/2D types) on every frame —
            // slower and more error-prone.
            formatsToSupport: [
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
            ],
            // Use the browser's native BarcodeDetector API when available —
            // significantly more accurate on 1D barcodes than the JS fallback.
            useBarCodeDetectorIfSupported: true,
            // The critical fix: without explicit constraints the browser
            // defaults to a low resolution (~640x480), which blurs the thin
            // lines of a 1D barcode. Request HD and continuous autofocus.
            videoConstraints: {
              facingMode: 'environment',
              width: { min: 1280, ideal: 1920 },
              height: { min: 720, ideal: 1080 },
              // `as unknown as ...`: TypeScript's DOM types don't know about
              // focusMode yet, even though real browsers support it. Cameras
              // that don't recognize it just ignore it — that's how
              // MediaStream constraints are designed to degrade — so this
              // cast is safe, it only silences a type-checker gap.
              advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
            },
          },
          false
        );
        try {
          s.render(
            // SUCCESS CALLBACK
            // Fires when html5-qrcode successfully reads a barcode from a frame.
            // async because lookupBarcode is an async fetch operation. We set
            // scanning false and clear the scanner AFTER the lookup completes,
            // not before — otherwise the scanner could be cleared while the
            // fetch is still in flight. Similar to an AI model finishing
            // inference before releasing GPU memory: clean up after the work
            // is done, not during it.
            async (decodedText: string) => {
              await lookupBarcode(decodedText);
              setScanning(false);
              // clear() returns a Promise. We chain .catch() rather than
              // awaiting it because a failure here is non-fatal — the barcode
              // was already successfully read and processed.
              s.clear().catch((clearError: unknown) => {
                console.error('Failed to clear barcode scanner:', clearError);
              });
            },
            // ERROR CALLBACK — PATH 1 (runtime permission denial)
            // Fires in two completely different situations:
            //   A — Routine frame miss (constant, harmless): a frame is
            //       blurry or the barcode isn't centered. At fps:10 this
            //       fires ten times a second. Not an error — must be ignored.
            //   B — Fatal permission block (fires once, critical): the user
            //       clicked Block on the camera prompt. The browser throws a
            //       NotAllowedError internally; html5-qrcode catches it and
            //       calls this callback with a message containing
            //       'NotAllowedError', 'permission', or 'denied'.
            // Similar to an AI model's confidence threshold: low-confidence
            // noise (frame misses) gets filtered quietly, confirmed failures
            // (permission blocks) trigger action.
            (errorMessage: unknown) => {
              // Normalize to a lowercase string so we can reliably search it
              // regardless of how different browsers phrase the error.
              const normalizedError = String(errorMessage ?? '').toLowerCase();
              const isPermissionError =
                normalizedError.includes('notallowederror') ||
                normalizedError.includes('permission') ||
                normalizedError.includes('denied');

              // Routine frame miss — return immediately. This guard clause is
              // what prevents toast flooding during normal camera operation.
              if (!isPermissionError) {
                console.warn('Barcode scanner frame miss:', errorMessage);
                return;
              }

              // Fatal permission block — everything below runs only when
              // camera access was genuinely blocked.
              toast.error('Camera access was blocked. Use manual barcode entry below.');
              setScanning(false);
              // Release the camera hardware thread. Without this the browser
              // can hold the capture device open even though nothing is
              // displaying. .catch() because we're inside a synchronous
              // callback — we can't await here without making the whole
              // error callback async, which html5-qrcode does not expect.
              s.clear().catch((clearError: unknown) => {
                console.error('Failed to clear barcode scanner:', clearError);
              });
            }
          );

          // PATH 3 — Pre-blocked permission (camera was blocked in browser
          // settings before the user ever clicked Start Camera).
          // html5-qrcode detects this internally and injects its own error
          // UI into the #barcode-scanner div — our error callback and
          // try/catch never fire. A MutationObserver watches the div and
          // intercepts that injected content before the user sees it.
          // Think of it like a security camera pointed at the div: when
          // html5-qrcode's error banner appears, we tear it down and show
          // our own UI instead.
          const target = document.getElementById('barcode-scanner');
          if (target) {
            observer = new MutationObserver(() => {
              const text = (target.textContent ?? '').toLowerCase();
              // These strings appear in html5-qrcode's built-in error banner.
              // Text-based detection is intentional — class names change
              // between library versions, text content is more stable.
              const isError =
                text.includes('notallowederror') ||
                text.includes('request is not allowed') ||
                text.includes('permission denied') ||
                text.includes('camera access');
              if (isError) {
                // Stop watching immediately — we have what we need.
                observer?.disconnect();
                toast.error('Camera access was blocked. Use manual entry below.');
                setScanning(false);
                // Use s (the local const) not scanner (the outer let) —
                // scanner = s is assigned after this try block, so scanner
                // may still be null at the moment this callback fires.
                s.clear().catch((clearError: unknown) => {
                  console.error('Failed to clear barcode scanner:', clearError);
                });
              }
            });
            observer.observe(target, { childList: true, subtree: true });
          }
        } catch (initError) {
          // PATH 2 — render() can throw synchronously — not via the error
          // callback — when camera initialization itself fails before any
          // frame is ever captured (no camera device found, or the device is
          // already held open by another application). This is a different
          // failure mode than the permission-block branch above, which only
          // handles errors html5-qrcode reports asynchronously through the
          // error callback.
          toast.error('Camera could not start. Use manual barcode entry below.');
          setScanning(false);
          s.clear?.().catch((clearError: unknown) => {
            console.error('Failed to clear scanner:', clearError);
          });
          console.error('Scanner initialization failed:', initError);
        }
        scanner = s;
      });
    }
    return () => {
      // Disconnect the observer first — no point receiving callbacks
      // for a div that is about to be unmounted.
      observer?.disconnect();
      // Cleanup runs on unmount or when scanning changes to false — the
      // normal exit path. Optional chaining (?.) protects against the case
      // where the outer scanner variable was never assigned, which happens
      // if the user navigates away before the dynamic import() resolves.
      // .catch() handles the case where clear() rejects, which can happen
      // if the scanner was already cleared by the error callback above —
      // html5-qrcode's clear() is idempotent, so double-clearing is safe.
      scanner?.clear().catch((clearError: unknown) => {
        console.error('Failed to clean up barcode scanner:', clearError);
      });
    };
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
