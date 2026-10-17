import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";
import { ACCEPTED_MIME, MAX_UPLOAD_MB } from "@/config";

export function validateFile(f: File): string | null {
  if (!(ACCEPTED_MIME as readonly string[]).includes(f.type)) return "Unsupported file type. Please upload JPG, PNG, or PDF.";
  if (f.size > MAX_UPLOAD_MB * 1024 * 1024) return `File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`;
  return null;
}

const fmt = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.ceil(n / 1024)} KB`);

export function ReceiptUpload({ file, onChange, error }: { file: File | null; onChange: (f: File | null) => void; error?: string | undefined }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const u = URL.createObjectURL(file);
      setPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setPreview(null);
    return undefined;
  }, [file]);

  const pick = (f?: File) => {
    if (!f) return;
    const e = validateFile(f);
    setLocalErr(e);
    onChange(e ? null : f);
  };
  const msg = localErr || error;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">Payment Confirmation / Receipt <span className="text-destructive">*</span></label>
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${drag ? "border-primary bg-accent" : msg ? "border-destructive/60 bg-card" : "border-input bg-card"}`}
        >
          <UploadCloud className="h-10 w-10 text-primary" strokeWidth={1.5} />
          <p className="mt-3 font-semibold">Drag & drop your receipt here</p>
          <p className="mt-1 text-sm text-muted-foreground">JPG, JPEG, PNG or PDF · up to {MAX_UPLOAD_MB} MB</p>
          <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent focus:outline-none focus:ring-4 focus:ring-primary/15">
            Browse files
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          {preview ? <img src={preview} alt="Receipt preview" className="h-16 w-16 rounded-md border border-border object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted"><FileText className="h-7 w-7 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{file.name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> {fmt(file.size)} · ready to submit</p>
            <button type="button" onClick={() => input.current?.click()} className="mt-1 text-sm font-semibold text-primary hover:underline">Replace</button>
          </div>
          <button type="button" aria-label="Remove file" onClick={() => { onChange(null); setLocalErr(null); }} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
      )}
      <input ref={input} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {msg && <p className="mt-1.5 text-sm text-destructive">{msg}</p>}
    </div>
  );
}
