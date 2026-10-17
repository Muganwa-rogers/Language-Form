import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { PAYMENT_METHODS } from "@/config";

type Method = (typeof PAYMENT_METHODS)[number];

export function PaymentCard({ method }: { method: Method }) {
  const [svg, setSvg] = useState("");
  const payload = `tel:${method.ussd}`;
  useEffect(() => {
    QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } }).then(setSvg);
  }, [payload]);
  const isMtn = method.tone === "mtn";
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className={`flex items-center justify-between px-5 py-3 ${isMtn ? "bg-mtn text-mtn-foreground" : "bg-airtel text-airtel-foreground"}`}>
        <span className="text-sm font-bold tracking-wide">{method.name}</span>
        <span className="rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-foreground">{method.id}</span>
      </div>
      <div className="flex flex-col items-center gap-3 p-5">
        <div className="h-44 w-44 rounded-lg border border-border bg-card p-2" aria-label={`QR code for ${method.name}: ${payload}`} role="img" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Or dial</div>
          <a href={`tel:${encodeURIComponent(method.ussd)}`} className="font-mono text-lg font-semibold text-foreground">{method.ussd}</a>
        </div>
        <ol className="w-full list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Scan the code with your phone camera, or open the dialer.</li>
          <li>If nothing opens, type <span className="font-mono text-foreground">{method.ussd}</span> manually and press call.</li>
          <li>Check the recipient name and number ({method.number}) before entering your PIN.</li>
        </ol>
      </div>
    </div>
  );
}
