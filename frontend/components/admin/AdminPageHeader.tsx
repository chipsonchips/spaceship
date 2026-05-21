"use client";

import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  className = "",
}: AdminPageHeaderProps) {
  return (
    <div
      className={`bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 break-words">
            {title}
          </h1>
          {description && (
            <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
