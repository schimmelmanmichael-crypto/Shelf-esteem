import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Shape returned by GET /api/pantry/external-barcode/:barcode (see
// barcodeService.ts). `barcode` is added on our side after the fetch so the
// confirm screen and the save call both know which code this result is for.
interface FoundProduct {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
}

export default function ScanPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  // BUG 1 fix: a successful lookup used to just toast and navigate away —
  // nothing ever got saved. This state holds the found product between
  // "lookup succeeded" and "user confirmed the details," which is the
  // confirmation screen the app was missing.
  const [foundProduct, setFoundProduct] = useState<FoundProduct | null>(null);
  const [confirmForm, setConfirmForm] = useState({ quantity: '1', unit: 'count', storageArea: 'pantry' });
  // Same reasoning as pantry/index.tsx's addRequestId: a stable key per save
  // attempt so a retry of the same submit doesn't create a duplicate item.
  const [addRequestId, setAddRequestId] = useState(() => crypto.randomUUID());

  async function lookupBarcode(barcode: string) {
    try {
      const res = await fetch(`/api/pantry/external-barcode/${barcode}`);
      const product = await res.json();
      if (product) {
        // Used to toast + navigate('/pantry') here — that's the exact spot
        // BUG 1 broke the chain. Now we hand off to the confirm screen
        // instead of leaving the found product with nowhere to go.
        setFoundProduct({ barcode, ...product });
        setConfirmForm({ quantity: '1', unit: 'count', storageArea: 'pantry' });
        setAddRequestId(crypto.randomUUID());
      } else {
        toast.info('Product not found — add it manually');
        // Carry the scanned code into the manual-entry field so the user
        // doesn't have to retype the number they just scanned.
        setManualBarcode(barcode);
      }
    } catch {
      toast.error('Lookup failed');
    }
  }

  // Same POST /api/pantry the manual "Add Item" form in pantry/index.tsx
  // uses — this is the save call that was missing entirely for scans.
  const addItem = useMutation({
    mutationFn: async () => {
      if (!foundProduct) throw new Error('No product to add');
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: foundProduct.name,
          brand: foundProduct.brand,
          category: foundProduct.category ?? 'other',
          quantity: Number(confirmForm.quantity),
          unit: confirmForm.unit,
          storageArea: confirmForm.storageArea,
          // BUG 4 fix: foundProduct.barcode was sitting right here in state
          // (set at line 46) but was never actually sent to the server —
          // the scanned item saved with no barcode on the row at all.
          barcode: foundProduct.barcode,
          idempotencyKey: addRequestId,
        }),
      });
      const body = await res.json();
      // fetch() only rejects on network failure, not 4xx/5xx — without this
      // check a 409 idempotency conflict would be parsed as JSON and treated
      // as success.
      if (!res.ok) throw new Error(body.message ?? body.error ?? 'Failed to add item');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      toast.success(`Added ${foundProduct?.name} to pantry`);
      setFoundProduct(null);
      navigate('/pantry');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add item'),
  });

  useEffect(() => {
    let scanner: { clear: () => Promise<void> } | null = null;
    // Declared here so the cleanup return can reach it even though
    // the assignment happens inside the async .then() below.
    let observer: MutationObserver | null = null;
    // BUG 3 fix: html5-qrcode's internal frame loop can call the success
    // callback several times for one physical barcode before our async
    // s.clear() actually stops it. A ref (not state) survives across those
    // calls without triggering a re-render, and checking+setting it as the
    // very first synchronous line of the callback — before any await —
    // means the second firing sees it already true and bails out
    // immediately. This is also what was silently causing BUG 2 (multiple
    // toasts): each duplicate firing was running its own independent fetch.
    const hasScannedRef = { current: false };
    if (scanning && videoRef.current) {
      import('html5-qrcode').then(({ Html5QrcodeScanner, Html5QrcodeSupportedFormats }) => {
        const s = new Html5QrcodeScanner(
          'barcode-scanner',
          {
            // Bumped from 10 — more scan attempts per second means less
            // time spent angling the phone to catch a frame.
            fps: 15,
            // Wide+short, not square — UPC/EAN barcodes are horizontal
            // stripes. A square box (the old `qrbox: 250`) crops the
            // left/right edges off the barcode before the decoder ever
            // sees a complete symbol, independent of resolution.
            qrbox: { width: 300, height: 150 },
            // Without this, Html5QrcodeScanner's own persistedDataManager
            // resets its saved camera ID on every construction (its default
            // "remember" behavior only kicks in when this flag is passed
            // explicitly), so the camera picker would reset every time this
            // screen opens.
            rememberLastUsedCamera: true,
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
              width: { min: 1280, ideal: 1280 },
              height: { min: 720, ideal: 720 },
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
              // Guard first, synchronously, before any await. JS is
              // single-threaded, so this check-and-set can't be interrupted
              // by another firing of this same callback — that's what makes
              // it an effective duplicate guard even though html5-qrcode's
              // frame loop can call us again before our async work below
              // finishes.
              if (hasScannedRef.current) return;
              hasScannedRef.current = true;
              // Stop the decode loop immediately rather than waiting for the
              // lookup + clear() below — the barcode is already read, there's
              // no reason to keep decoding frames.
              s.pause(true);
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

        {foundProduct ? (
          // BUG 1 fix: this is the confirmation step that used to be
          // missing entirely — a successful lookup now lands here instead
          // of silently toasting and navigating away with nothing saved.
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-1">
              <p className="font-bold text-lg">{foundProduct.name}</p>
              {foundProduct.brand && <p className="text-sm text-[var(--muted-foreground)]">{foundProduct.brand}</p>}
              <p className="text-xs text-[var(--muted-foreground)] font-mono">{foundProduct.barcode}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={confirmForm.quantity}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^\d*\.?\d*$/.test(v)) {
                      setConfirmForm(f => ({ ...f, quantity: v }));
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Input
                  value={confirmForm.unit}
                  onChange={e => setConfirmForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. lb, oz, count"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Storage</Label>
              <Select value={confirmForm.storageArea} onValueChange={v => setConfirmForm(f => ({ ...f, storageArea: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['pantry', 'fridge', 'freezer', 'counter'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" size="lg" disabled={addItem.isPending} onClick={() => addItem.mutate()}>
              {addItem.isPending ? 'Adding...' : 'Add to Pantry'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFoundProduct(null)}>Cancel</Button>
              <Button variant="outline" className="flex-1" onClick={() => { setFoundProduct(null); setScanning(true); }}>Scan Again</Button>
            </div>
          </div>
        ) : !scanning ? (
          <Tabs defaultValue="scan">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="scan" className="flex-1">Scan</TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
            </TabsList>
            <TabsContent value="scan">
              <div className="text-center space-y-6">
                <div className="text-6xl">📷</div>
                <p className="text-[var(--muted-foreground)]">Point your camera at any product barcode to look it up automatically.</p>
                <Button className="w-full" size="lg" onClick={() => setScanning(true)}>
                  Start Camera
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="manual">
              <div className="space-y-2">
                <Label>Barcode number</Label>
                <div className="flex gap-2">
                  <Input value={manualBarcode} onChange={e => setManualBarcode(e.target.value)} placeholder="e.g. 012345678901" />
                  <Button disabled={!manualBarcode} onClick={() => lookupBarcode(manualBarcode)}>Look Up</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
