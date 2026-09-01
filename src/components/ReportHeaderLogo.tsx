import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    setHasError(false);
  }, [effectiveUrl]);

  if (hasError) {
    return (
      <img
        src="/icon.png"
        alt={alt}
        loading="eager"
        className={`shrink-0 ${className}`}
      />
    );
  }

  const isDataUri = effectiveUrl.startsWith("data:");

  return (
    <img
      src={effectiveUrl}
      alt={alt}
      {...(!isDataUri ? { crossOrigin: "anonymous" as const } : {})}
      loading="eager"
      onError={() => setHasError(true)}
      className={`shrink-0 ${className}`}
    />
  );
};
