import React, { useState } from "react";
import { Tenant, SystemSettings } from "../types";

export interface ResolvedCompanyInfo {
  companyName: string;
  companySubtitle: string;
  logoUrl: string | null;
  rawLogo: string | null;
}

/**
 * Robust resolution of company metadata (Name, Subtitle/Description, and uploaded Logo)
 * Prioritizes custom uploaded logos and names configured in the system.
 */
export function resolveCompanyInfo(
  activeTenant?: Tenant | null,
  systemSettings?: SystemSettings | null,
  tenants?: Tenant[]
): ResolvedCompanyInfo {
  const currentTenant =
    activeTenant ||
    tenants?.find((t) => t.id === "imperio") ||
    tenants?.[0];

  // 1. Resolve Company Name:
  const companyName =
    (systemSettings?.companyName && systemSettings.companyName.trim() !== "")
      ? systemSettings.companyName.trim()
      : (currentTenant?.name && currentTenant.name.trim() !== "")
      ? currentTenant.name.trim()
      : "IMPÉRIO ACESSÓRIOS";

  // 2. Resolve Company Description / Subtitle:
  const companySubtitle =
    (systemSettings?.systemName && systemSettings.systemName.trim() !== "")
      ? systemSettings.systemName.trim()
      : (currentTenant?.systemName && currentTenant.systemName.trim() !== "")
      ? currentTenant.systemName.trim()
      : (currentTenant as any)?.description && (currentTenant as any).description.trim() !== ""
      ? (currentTenant as any).description.trim()
      : "";

  // 3. Resolve Logo (prefer valid uploaded image / data URI over generic placeholder):
  const isCustomLogo = (url?: string | null): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed === "/icon.png" || trimmed.endsWith("/icon.png")) return false;
    return true;
  };

  let logoUrl: string | null = null;
  if (isCustomLogo(systemSettings?.companyLogoUrl)) {
    logoUrl = systemSettings!.companyLogoUrl!.trim();
  } else if (isCustomLogo(currentTenant?.logoUrl)) {
    logoUrl = currentTenant!.logoUrl!.trim();
  } else if (systemSettings?.companyLogoUrl && systemSettings.companyLogoUrl.trim() !== "") {
    logoUrl = systemSettings.companyLogoUrl.trim();
  } else if (currentTenant?.logoUrl && currentTenant.logoUrl.trim() !== "") {
    logoUrl = currentTenant.logoUrl.trim();
  }

  return {
    companyName,
    companySubtitle,
    logoUrl,
    rawLogo: logoUrl,
  };
}

interface CompanyLogoProps {
  logoUrl?: string | null;
  companyName?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal Company Logo component for printed and on-screen label rendering.
 * Never renders emojis; uses the real uploaded logo or a clean professional initial fallback.
 */
export function CompanyLogo({
  logoUrl,
  companyName = "IMPÉRIO",
  className = "w-4 h-4",
  style,
}: CompanyLogoProps) {
  const [hasError, setHasError] = useState(false);

  const cleanLogo = logoUrl && logoUrl.trim() !== "" ? logoUrl.trim() : null;

  if (!cleanLogo || hasError) {
    const initial = (companyName || "I").trim().charAt(0).toUpperCase();
    return (
      <div
        className={`${className} rounded-xs bg-slate-900 flex items-center justify-center shrink-0 text-white font-black text-[9px] select-none border border-slate-700 leading-none`}
        style={style}
      >
        {initial}
      </div>
    );
  }

  const isDataUri = cleanLogo.startsWith("data:");

  return (
    <img
      src={cleanLogo}
      alt="logo"
      {...(!isDataUri ? { crossOrigin: "anonymous" } : {})}
      loading="eager"
      className={`${className} object-contain rounded-xs shrink-0 bg-transparent`}
      style={style}
      onError={() => setHasError(true)}
    />
  );
}
