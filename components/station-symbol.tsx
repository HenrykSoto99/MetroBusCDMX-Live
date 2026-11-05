"use client";

import { useEffect, useState } from "react";
import styles from "./station-symbol.module.css";

const FALLBACK_STATION_SYMBOL = "/brand/station-mb.svg";

export interface StationSymbolProps {
  pictogramUrl?: string | null;
  alt: string;
  size?: number;
  className?: string;
}

export function StationSymbol({ pictogramUrl, alt, size = 48, className }: StationSymbolProps) {
  const [pictogramFailed, setPictogramFailed] = useState(false);
  const hasPictogram = Boolean(pictogramUrl?.trim());
  const source = hasPictogram && !pictogramFailed ? pictogramUrl!.trim() : FALLBACK_STATION_SYMBOL;

  useEffect(() => {
    setPictogramFailed(false);
  }, [pictogramUrl]);

  return (
    <span
      className={[styles.symbol, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      aria-label={alt}
      role="img"
    >
      <img
        src={source}
        alt={alt}
        onError={() => {
          if (hasPictogram) setPictogramFailed(true);
        }}
      />
    </span>
  );
}

export default StationSymbol;
