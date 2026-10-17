import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CheckCircle2, Loader2, AlertCircle, ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import { APPS_SCRIPT_URL, COURSES, DECLARATION, LEVELS, PAYMENT_METHODS, PROGRAM_NAME } from "@/config";
import { PaymentCard } from "@/components/apply/PaymentCard";
import { ReceiptUpload, validateFile } from "@/components/apply/ReceiptUpload";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Apply Kinyarwanda & English Courses" },
      { name: "description", content: "Register for Kinyarwanda or English language courses. Pay with MTN or Airtel Mobile Money and upload your receipt." },
      { property: "og:title", content: "Apply Kinyarwanda & English Courses" },
      { property: "og:description", content: "Register for a Kinyarwanda or English course and submit your mobile money receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Apply,
});

const STEPS = ["Welcome", "Personal", "Course", "Pay", "Payment details", "Declaration", "Review"];

type Form = {
  fullName: string; whatsapp: string; email: string;
  course: string; level: string;
  network: string; amount: string; transactionId: string; paymentDate: string;
  message: string; declaration: boolean;
};
type Errs = Partial<Record<keyof Form | "file", string>>;
const empty: Form = { fullName: "", whatsapp: "", email: "", course: "", level: "", network: "", amount: "", transactionId: "", paymentDate: "", message: "", declaration: false };

function validate(step: number, f: Form, file: File | null) {
  const e: Errs = {};
  if (step === 1) {
    if (f.fullName.trim().length < 3) e.fullName = "Please enter your full legal name.";
    if (!/^\+\d{7,15}$/.test(f.whatsapp.replace(/[\s-]/g, ""))) e.whatsapp = "Include the country code, e.g. +250 788 123 456.";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Please enter a valid email address.";
  }
  if (step === 2) {
    if (!f.course) e.course = "Please choose a course.";
    if (!f.level) e.level = "Please select your current level.";
  }
  if (step === 4) {
    if (!f.network) e.network = "Select the network you paid with.";
    if (!(Number(f.amount) > 0)) e.amount = "Enter the amount you paid.";
    if (f.transactionId.trim().length < 4) e.transactionId = "Enter the transaction reference from your SMS.";
    if (!f.paymentDate) e.paymentDate = "Select the payment date.";
    else if (f.paymentDate > new Date().toISOString().slice(0, 10)) e.paymentDate = "Payment date cannot be in the future.";
    if (!file) e.file = "Please upload your payment confirmation.";
    else { const fe = validateFile(file); if (fe) e.file = fe; }
  }
  if (step === 5 && !f.declaration) e.declaration = "You must confirm this declaration to continue.";
  return e;
}

const toBase64 = (file: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] ?? "");
  r.onerror = () => rej(new Error("Could not read the file."));
  r.readAsDataURL(file);
});

function Apply() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errs>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [reference, setReference] = useState("");
  const submissionId = useRef(crypto.randomUUID());
  const top = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((p) => ({ ...p, [k]: v })); setErrors((p) => { const n = { ...p }; delete n[k]; return n; }); };
  const go = (n: number) => { setStep(n); top.current?.scrollIntoView({ behavior: "smooth" }); };
  const next = () => { const e = validate(step, f, file); setErrors(e); if (!Object.keys(e).length) go(step + 1); };

  async function submit() {
    for (const s of [1, 2, 4, 5]) { const e = validate(s, f, file); if (Object.keys(e).length) { setErrors(e); go(s); return; } }
    if (!APPS_SCRIPT_URL) { setStatus("error"); setServerError("Submissions are not connected yet. The site owner must add the Google Apps Script URL."); return; }
    setStatus("sending"); setServerError("");
    try {
      const payload = { ...f, whatsapp: f.whatsapp.replace(/[\s-]/g, ""), submissionId: submissionId.current, file: { name: file!.name, type: file!.type, size: file!.size, data: await toBase64(file!) } };
      const res = await fetch(APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      const out = await res.json();
      if (!out.ok || !out.reference) throw new Error(out.error || "The server could not save your application.");
      setReference(out.reference); go(7);
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "We couldn't reach the server. Check your connection and try again — you won't be charged twice.");
      return;
    }
    setStatus("idle");
  }

  return (
    <div className="min-h-screen bg-background" ref={top}>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        {step > 0 && step < 7 && <Progress step={step} />}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">
          {step === 0 && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">Application 2026</p>
              <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Learn Kinyarwanda or English</h1>
              <p className="mt-4 text-lg text-muted-foreground">Complete this application in about five minutes. You'll choose a course, pay with mobile money, and upload your receipt.</p>
              <ul className="mt-6 space-y-2.5 text-[15px]">
                {["Your full legal name and WhatsApp number", "Payment from a mobile money account in your own name", "A screenshot or PDF of your payment confirmation"].map((t) => (
                  <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{t}</li>
                ))}
              </ul>
              <button onClick={() => go(1)} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20">Start application <ArrowRight className="h-4 w-4" /></button>
            </div>
          )}

          {step === 1 && (
            <Section title="Personal information" sub="Use the name exactly as it appears on your mobile money account.">
              <Field label="Full legal name" required error={errors.fullName}><input className="field-input" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} autoComplete="name" maxLength={120} /></Field>
              <Field label="WhatsApp phone number" required help="Include your country code. Our team will contact you here." error={errors.whatsapp}><input className="field-input" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} aria-invalid={!!errors.whatsapp} placeholder="+250 788 123 456" inputMode="tel" autoComplete="tel" maxLength={20} /></Field>
              <Field label="Email address" help="Optional." error={errors.email}><input className="field-input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} autoComplete="email" maxLength={200} /></Field>
            </Section>
          )}

          {step === 2 && (
            <Section title="Choose your course" sub="Select one course.">
              <div className="grid gap-4 sm:grid-cols-2" role="radiogroup">
                {COURSES.map((c) => {
                  const on = f.course === c.id;
                  return (
                    <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => set("course", c.id)} className={`relative rounded-xl border-2 p-5 text-left transition focus:outline-none focus:ring-4 focus:ring-primary/15 ${on ? "border-primary bg-accent" : "border-border bg-card hover:border-input"}`}>
                      <span className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-primary bg-primary" : "border-input"}`}>{on && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}</span>
                      <div className="font-display text-2xl font-semibold">{c.title}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">{c.audience}</div>
                      <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
                      {c.details.map((d) => <p key={d} className="mt-1 text-sm">{d}</p>)}
                    </button>
                  );
                })}
              </div>
              {errors.course && <p className="text-sm text-destructive">{errors.course}</p>}
              <Field label="Current proficiency level" required error={errors.level}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LEVELS.map((l) => (
                    <button key={l} type="button" onClick={() => set("level", l)} aria-pressed={f.level === l} className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${f.level === l ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-muted"}`}>{l}</button>
                  ))}
                </div>
              </Field>
            </Section>
          )}

          {step === 3 && (
            <Section title="Pay with mobile money" sub="Choose your network and pay using the code below. You'll enter the details on the next step.">
              <div className="grid gap-5 sm:grid-cols-2">{PAYMENT_METHODS.map((m) => <PaymentCard key={m.id} method={m} />)}</div>
              <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Before you pay</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Always confirm the recipient name and number on your phone before entering your PIN.</li>
                  <li>Scanning a QR code may not open the payment menu on every phone — dial the code manually if needed.</li>
                  <li>Scanning does not confirm a payment. Keep the confirmation SMS or a screenshot.</li>
                  <li>Pay only from an account registered in your own legal name.</li>
                </ul>
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="Payment details" sub="Copy these from your confirmation SMS.">
              <Field label="Network used" required error={errors.network}>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m.id} type="button" onClick={() => set("network", m.id)} aria-pressed={f.network === m.id} className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition ${f.network === m.id ? "border-primary bg-accent" : "border-input bg-card hover:bg-muted"}`}>{m.short}</button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Amount paid (RWF)" required error={errors.amount}><input className="field-input" inputMode="numeric" value={f.amount} onChange={(e) => set("amount", e.target.value.replace(/[^\d.]/g, ""))} aria-invalid={!!errors.amount} /></Field>
                <Field label="Payment date" required error={errors.paymentDate}><input className="field-input" type="date" value={f.paymentDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("paymentDate", e.target.value)} aria-invalid={!!errors.paymentDate} /></Field>
              </div>
              <Field label="Transaction reference / ID" required error={errors.transactionId}><input className="field-input font-mono" value={f.transactionId} onChange={(e) => set("transactionId", e.target.value)} aria-invalid={!!errors.transactionId} maxLength={60} /></Field>
              <ReceiptUpload file={file} onChange={(x) => { setFile(x); setErrors((p) => { const n = { ...p }; delete n.file; return n; }); }} error={errors.file} />
            </Section>
          )}

          {step === 5 && (
            <Section title="Payment declaration" sub="Please read carefully.">
              <label className={`flex cursor-pointer gap-4 rounded-xl border-2 p-5 transition ${f.declaration ? "border-primary bg-accent" : errors.declaration ? "border-destructive/60" : "border-border"}`}>
                <input type="checkbox" checked={f.declaration} onChange={(e) => set("declaration", e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" />
                <span className="text-[15px] leading-relaxed">{DECLARATION}</span>
              </label>
              {errors.declaration && <p className="text-sm text-destructive">{errors.declaration}</p>}
              <Field label="Message or additional information" help="Optional — report a problem or add anything we should know.">
                <textarea className="field-input min-h-28" value={f.message} onChange={(e) => set("message", e.target.value)} maxLength={1000} />
              </Field>
            </Section>
          )}

          {step === 6 && (
            <Section title="Review your application" sub="Check everything before submitting.">
              <Review title="Personal" onEdit={() => go(1)} rows={[["Full legal name", f.fullName], ["WhatsApp", f.whatsapp], ["Email", f.email || "—"]]} />
              <Review title="Course" onEdit={() => go(2)} rows={[["Course", f.course], ["Level", f.level]]} />
              <Review title="Payment" onEdit={() => go(4)} rows={[["Network", f.network], ["Amount", `${f.amount} RWF`], ["Transaction ID", f.transactionId], ["Date", f.paymentDate], ["Receipt", file?.name ?? "—"]]} />
              <Review title="Declaration" onEdit={() => go(5)} rows={[["Confirmed", f.declaration ? "Yes" : "No"], ["Message", f.message || "—"]]} />
              {status === "error" && <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="h-5 w-5 shrink-0" />{serverError}</div>}
            </Section>
          )}

          {step === 7 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent"><CheckCircle2 className="h-9 w-9 text-primary" /></div>
              <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">Application received</h1>
              <p className="mt-3 text-muted-foreground">Your application and payment receipt have been saved.</p>
              <div className="mx-auto mt-6 inline-block rounded-xl border border-border bg-muted px-6 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Application reference</div>
                <div className="mt-1 font-mono text-2xl font-semibold">{reference}</div>
              </div>
              <div className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm text-muted-foreground">
                <p className="flex gap-3"><MessageCircle className="h-5 w-5 shrink-0 text-primary" />Our team will manually verify your payment and contact you on WhatsApp at <span className="font-semibold text-foreground">{f.whatsapp}</span>.</p>
                <p className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-primary" />Submitting does not mean your application or payment has been approved. Please keep your reference for any questions.</p>
              </div>
            </div>
          )}

          {step > 0 && step < 7 && (
            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <button onClick={() => go(step - 1)} disabled={status === "sending"} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Back</button>
              {step < 6 ? (
                <button onClick={next} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20">Continue<ArrowRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={submit} disabled={status === "sending"} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-70">
                  {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : "Submit application"}
                </button>
              )}
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Your information is stored privately and used only to process your application.</p>
      </main>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  const pct = useMemo(() => (step / (STEPS.length - 1)) * 100, [step]);
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{STEPS[step]}</span><span className="text-muted-foreground">Step {step} of {STEPS.length - 1}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (<div><h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>{sub && <p className="mt-1.5 text-muted-foreground">{sub}</p>}<div className="mt-7 space-y-5">{children}</div></div>);
}

function Field({ label, required, help, error, children }: { label: string; required?: boolean; help?: string; error?: string | undefined; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}{required && <span className="text-destructive"> *</span>}</label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-destructive">{error}</p> : help && <p className="mt-1.5 text-sm text-muted-foreground">{help}</p>}
    </div>
  );
}

function Review({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5"><span className="font-semibold">{title}</span><button onClick={onEdit} className="text-sm font-semibold text-primary hover:underline">Edit</button></div>
      <dl className="divide-y divide-border">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="col-span-2 break-words">{v}</dd></div>)}</dl>
    </div>
  );
}
