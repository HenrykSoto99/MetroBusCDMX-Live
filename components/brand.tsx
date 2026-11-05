"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/preferences";

export function Brand({ compact = false, light = false, variant }: {
  compact?: boolean;
  light?: boolean;
  variant?: "landing" | "app";
}) {
  const { t } = useTranslation();
  const kind = variant ?? (compact ? "app" : "landing");
  const source = kind === "app" ? "/brand/app-logo.png" : "/brand/landing-logo.png";

  return (
    <Link href="/" className={cn("brand", light && "brand-light")} aria-label={t("MetroBusCDMX-Live — inicio", "MetroBusCDMX-Live — home")}>
      <span className={`brand-mark brand-image brand-image-${kind}`} aria-hidden="true">
        <img src={source} alt="" width={kind === "app" ? 256 : 288} height={kind === "app" ? 256 : 128} />
      </span>
      {!compact && <span className="brand-type">MetroBus<span className="brand-sub">CDMX<span className="brand-live">— LIVE</span></span><span className="sr-only">MetroBusCDMX-Live</span></span>}
    </Link>
  );
}
