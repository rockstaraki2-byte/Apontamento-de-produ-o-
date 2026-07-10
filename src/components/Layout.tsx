import React from "react";

/**
 * ScreenLayout - Main Container for standard screens.
 * Forces 100% height within the shell and hides global overflow to prevent dual-scrolling.
 */
interface ScreenLayoutProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function ScreenLayout({ children, className = "", id }: ScreenLayoutProps) {
  return (
    <div
      id={id || "screen-layout-root"}
      className={`flex-1 flex flex-col min-h-0 w-full overflow-hidden relative ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * ScreenHeader - Clean, high-density screen title block.
 * Shrinks paddings dynamically on small or landscape displays.
 */
interface ScreenHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  id?: string;
}

export function ScreenHeader({ title, description, actions, icon, id }: ScreenHeaderProps) {
  return (
    <header
      id={id || "screen-header"}
      className="shrink-0 bg-white border-b border-slate-150/80 px-3 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 z-10 shadow-xs"
    >
      <div className="flex items-start gap-1.5 max-w-full">
        {icon && <div className="text-indigo-600 mt-0.5 shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight leading-tight truncate">
            {title}
          </h2>
          {description && (
            <p className="text-[9px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5 tracking-tight hidden xs:block">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0 self-end sm:self-center overflow-x-auto min-w-0 max-w-full pb-0.5 sm:pb-0">
          {actions}
        </div>
      )}
    </header>
  );
}

/**
 * CompactScreenHeader - Super-compact screen header for hand-held and operator devices.
 */
export function CompactScreenHeader({
  title,
  actions,
  badge,
  icon,
  id,
}: {
  title: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id || "compact-screen-header"}
      className="shrink-0 bg-slate-900 text-white px-3 py-2 flex items-center justify-between gap-2 border-b border-indigo-500/20"
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-indigo-400 shrink-0">{icon}</span>}
        <span className="font-extrabold text-xs sm:text-sm tracking-tight truncate uppercase">
          {title}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
      </div>
      {actions && <div className="flex items-center gap-1 pr-1 shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * ScrollContainer - Area designated for scrolling items inside a screen.
 * Resolves scrolling conflicts cleanly by taking remaining height.
 */
interface ScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  paddingSize?: "none" | "dense" | "normal" | "spacious";
}

export function ScrollContainer({
  children,
  className = "",
  id,
  paddingSize = "normal",
}: ScrollContainerProps) {
  const paddingClasses = {
    none: "p-0",
    dense: "p-1.5 sm:p-2",
    normal: "p-2.5 sm:p-3.5 md:p-4",
    spacious: "p-3.5 sm:p-5 md:p-6",
  };

  return (
    <div
      id={id || "scroll-container"}
      className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin scroll-smooth min-w-0 ${paddingClasses[paddingSize]} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * StickyActionsBar - Reusable bottom action overlay panel.
 * Designed to place floating operational triggers safely.
 */
interface StickyActionsBarProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function StickyActionsBar({ children, className = "", id }: StickyActionsBarProps) {
  return (
    <div
      id={id || "sticky-actions-bar"}
      className={`shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-2.5 sm:p-3.5 flex items-center justify-end gap-2.5 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * ResponsiveCardGrid - Automatically handles standard column layouts per screen.
 * Implements density triggers and scales gaps gracefully.
 */
interface ResponsiveCardGridProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  cols?: "1" | "2" | "3" | "4" | "auto";
}

export function ResponsiveCardGrid({
  children,
  className = "",
  id,
  cols = "auto",
}: ResponsiveCardGridProps) {
  const colClasses = {
    "1": "grid-cols-1",
    "2": "grid-cols-1 sm:grid-cols-2",
    "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div
      id={id}
      className={`grid ${colClasses[cols]} gap-2 xs:gap-3 sm:gap-4 w-full ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * SectionBlock - Grouping box with fine-tuned paddings and borders.
 */
interface SectionBlockProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  id?: string;
  variant?: "white" | "slate" | "warning" | "rose" | "indigo";
}

export function SectionBlock({
  children,
  title,
  subtitle,
  actions,
  className = "",
  id,
  variant = "white",
}: SectionBlockProps) {
  const variantClasses = {
    white: "bg-white border-slate-200/80 text-slate-800 shadow-xs",
    slate: "bg-slate-50 border-slate-200 text-slate-800 shadow-none",
    warning: "bg-amber-50/20 border-amber-200/55 text-slate-800 shadow-none",
    rose: "bg-rose-50/15 border-rose-200 text-slate-800 shadow-none",
    indigo: "bg-indigo-50/10 border-indigo-150/80 text-indigo-950 shadow-none",
  };

  return (
    <section
      id={id}
      className={`border rounded-lg p-2.5 sm:p-3.5 relative overflow-hidden transition-all duration-150 ${variantClasses[variant]} ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-2.5">
          <div>
            {title && (
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-1 select-none leading-none">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * MobileCompactToolbar - Packed line for filters, inputs, or badges.
 * Stacks perfectly and does not drop on weird devices.
 */
interface MobileCompactToolbarProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function MobileCompactToolbar({
  children,
  className = "",
  id,
}: MobileCompactToolbarProps) {
  return (
    <div
      id={id || "mobile-compact-toolbar"}
      className={`shrink-0 bg-slate-50 border-b border-slate-150 p-2 sm:p-2.5 flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-full ${className}`}
    >
      {children}
    </div>
  );
}
