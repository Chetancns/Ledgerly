"use client";

import React from "react";
import clsx from "clsx";

// Skeleton component props
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  animate?: boolean;
}

// Base Skeleton component
export function Skeleton({
  className = "",
  width,
  height = "h-4",
  rounded = "md",
  animate = true,
}: SkeletonProps) {
  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
  };

  return (
    <div
      className={clsx(
        "skeleton-shimmer",
        roundedClasses[rounded],
        height,
        width,
        animate && "animate-pulse",
        className
      )}
      aria-hidden="true"
    />
  );
}

// Card skeleton for dashboard cards
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-6 skeleton-shimmer",
        className
      )}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <div className="flex items-center gap-4 mb-4">
        <Skeleton width="w-12" height="h-12" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-32" height="h-4" />
          <Skeleton width="w-24" height="h-3" />
        </div>
      </div>
      <Skeleton width="w-full" height="h-20" rounded="lg" />
    </div>
  );
}

// Transaction list item skeleton
export function SkeletonTransactionItem() {
  return (
    <div
      className="flex flex-col justify-between bg-[var(--bg-card)] shadow-[var(--shadow-sm)] border-l-4 border-[var(--skeleton-base)] rounded-md p-3"
    >
      {/* Top Row */}
      <div className="flex justify-between items-center mb-2">
        <Skeleton width="w-24" height="h-6" />
        <Skeleton width="w-20" height="h-4" />
      </div>
      {/* Middle Row */}
      <div className="space-y-2 mb-2">
        <Skeleton width="w-32" height="h-4" />
        <Skeleton width="w-28" height="h-3" />
        <Skeleton width="w-full" height="h-3" />
      </div>
      {/* Bottom Row */}
      <div className="flex justify-between items-center">
        <Skeleton width="w-16" height="h-5" rounded="full" />
        <div className="flex gap-2">
          <Skeleton width="w-8" height="h-8" rounded="md" />
          <Skeleton width="w-8" height="h-8" rounded="md" />
        </div>
      </div>
    </div>
  );
}

// Account list item skeleton
export function SkeletonAccountItem() {
  return (
    <div
      className="p-4 rounded-lg flex justify-between items-center"
      style={{ background: "var(--bg-card)" }}
    >
      <div className="flex-1 space-y-2">
        <Skeleton width="w-40" height="h-5" />
        <Skeleton width="w-24" height="h-4" />
      </div>
      <div className="flex gap-2">
        <Skeleton width="w-8" height="h-8" rounded="md" />
        <Skeleton width="w-8" height="h-8" rounded="md" />
      </div>
    </div>
  );
}

// Chart skeleton
export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div
      className={clsx("rounded-2xl p-6", className)}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-primary)",
      }}
    >
      <Skeleton width="w-40" height="h-6" className="mb-4" />
      <div className="flex items-end gap-2 h-48">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              height={`h-${Math.floor(Math.random() * 32 + 16)}`}
              width="w-full"
              rounded="sm"
              className="min-h-[2rem]"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow() {
  return (
    <tr className="border-b border-[var(--border-secondary)]">
      <td className="px-3 py-3"><Skeleton width="w-20" height="h-4" /></td>
      <td className="px-3 py-3"><Skeleton width="w-24" height="h-4" /></td>
      <td className="px-3 py-3"><Skeleton width="w-28" height="h-4" /></td>
      <td className="px-3 py-3"><Skeleton width="w-20" height="h-4" /></td>
      <td className="px-3 py-3"><Skeleton width="w-24" height="h-4" /></td>
      <td className="px-3 py-3"><Skeleton width="w-full" height="h-4" /></td>
      <td className="px-3 py-3"><Skeleton width="w-16" height="h-5" rounded="full" /></td>
      <td className="px-3 py-3">
        <div className="flex gap-2 justify-end">
          <Skeleton width="w-6" height="h-6" rounded="md" />
          <Skeleton width="w-6" height="h-6" rounded="md" />
        </div>
      </td>
    </tr>
  );
}

// Form skeleton
export function SkeletonForm() {
  return (
    <div className="space-y-4">
      <Skeleton width="w-full" height="h-12" rounded="xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton width="w-full" height="h-12" rounded="xl" />
        <Skeleton width="w-full" height="h-12" rounded="xl" />
      </div>
      <Skeleton width="w-full" height="h-12" rounded="xl" />
      <div className="flex gap-4">
        <Skeleton width="w-32" height="h-12" rounded="xl" />
        <Skeleton width="w-32" height="h-12" rounded="xl" />
      </div>
    </div>
  );
}

// Dashboard loading skeleton
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Balance card */}
      <SkeletonCard className="h-40" />
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Skeleton width="w-24" height="h-10" rounded="lg" />
        <Skeleton width="w-24" height="h-10" rounded="lg" />
        <Skeleton width="w-32" height="h-10" rounded="lg" />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      
      {/* Budget utilization */}
      <SkeletonCard className="h-64" />
    </div>
  );
}

// Transaction list skeleton
export function SkeletonTransactionList({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-2">
      {[...Array(count)].map((_, i) => (
        <SkeletonTransactionItem key={i} />
      ))}
    </div>
  );
}
