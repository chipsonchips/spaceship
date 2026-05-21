"use client";

import type { ReactNode } from "react";

interface AdminFormRowProps {
  children: ReactNode;
  className?: string;
}

/** Stacks controls vertically on mobile, horizontal from sm breakpoint up. */
export function AdminFormRow({ children, className = "" }: AdminFormRowProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-2 sm:items-stretch ${className}`}
    >
      {children}
    </div>
  );
}
