import React, { useState } from "react";

interface ReportHeaderLogoProps {
  logoUrl?: string | null;
  className?: string;
  alt?: string;
}

/**
 * High-reliability Logo component for Printable Sheets, PDFs, and Report headers.
 * Preloads images, sets crossOrigin, and falls back to a clean vector logo if broken/missing.
 */
export const ReportHeaderLogo: React.FC<ReportHeaderLogoProps> = ({
  logoUrl,
  className = "w-10 h-10 object-contain",
  alt = "Logo Império"
}) => {
  const [hasError, setHasError] = useState(false);

  const cleanUrl = logoUrl?.trim();
  const effectiveUrl = cleanUrl && cleanUrl !== "" ? cleanUrl : "/icon.png";

  if (hasError) {
    // Elegant fallback SVG badge (Império Green Crown)
    return (
      <div className={`flex items-center justify-center bg-emerald-700 text-white rounded-lg p-1.5 shadow-sm border border-emerald-800 shrink-0 ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
          <circle cx="50" cy="20" r="6" fill="#ffffff" />
          <path d="M10 65 C 10 40, 30 30, 45 35 C 50 30, 50 30, 55 35 C 70 30, 90 40, 90 65 L 80 65 C 80 50, 65 45, 55 55 L 45 55 C 35 45, 20 50, 20 65 Z" fill="#ffffff" />
          <rect x="20" y="72" width="60" height="8" rx="4" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={effectiveUrl}
      alt={alt}
      crossOrigin="anonymous"
      loading="eager"
      onError={() => setHasError(true)}
      className={`shrink-0 ${className}`}
    />
  );
};
