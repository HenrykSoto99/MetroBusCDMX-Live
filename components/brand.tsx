import Link from "next/link";
import { cn } from "@/lib/utils";
export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return <Link href="/" className={cn("brand", light && "brand-light")} aria-label="MetroBusCDMX-Live — inicio">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M7 33V17h7l10 10 10-10h7v16h-8v-7l-9 9-9-9v7H7Z" fill="currentColor"/><path d="M7 9h34v4H7z" fill="currentColor"/></svg></span>
    {!compact && <span className="brand-type">MetroBus<span className="brand-sub">CDMX<span className="brand-live">— LIVE</span></span><span className="sr-only">MetroBusCDMX-Live</span></span>}
  </Link>;
}
