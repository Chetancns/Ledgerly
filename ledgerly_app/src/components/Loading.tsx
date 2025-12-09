"use client";

import React from "react";
import { SkeletonDashboard } from "./Skeleton";

export default function Loading() {
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "var(--ledgerly-grad)" }}
      role="status"
      aria-label="Loading dashboard"
      aria-live="polite"
    >
      {/* Desktop/Tablet Navbar Skeleton */}
      <nav
        className="sticky top-0 z-50 hidden md:flex items-center px-4 lg:px-6 py-3 backdrop-blur-md"
        style={{
          background: "var(--nav-bg)",
          borderBottom: "1px solid var(--border-primary)",
        }}
        aria-hidden="true"
      >
        <span 
          className="text-lg md:text-2xl font-extrabold tracking-wide drop-shadow-md mr-4 lg:mr-6"
          style={{ color: "var(--text-primary)" }}
        >
          💰 Ledgerly
        </span>
        <div className="flex gap-2 lg:gap-4 flex-1 ml-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-20 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <div className="h-10 w-10 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
          <div className="h-10 w-24 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        </div>
      </nav>

      {/* Mobile Top Header Skeleton */}
      <div 
        className="flex items-center justify-between px-3 py-3 md:hidden backdrop-blur-md sticky top-0 z-50"
        style={{
          background: "var(--nav-bg)",
          borderBottom: "1px solid var(--border-primary)",
        }}
        aria-hidden="true"
      >
        <span className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
          💰 Ledgerly
        </span>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
          <div className="h-8 w-8 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-4 p-4 md:p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="h-8 w-48 rounded-lg animate-pulse mb-2" style={{ background: "var(--bg-card)" }} />
          <div className="h-6 w-72 rounded-lg animate-pulse" style={{ background: "var(--bg-card)" }} />
        </div>

        {/* Dashboard Grid - Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="rounded-2xl p-4 min-h-[120px]"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
              aria-hidden="true"
            >
              <div className="h-4 w-24 rounded animate-pulse mb-3" style={{ background: "var(--border-primary)" }} />
              <div className="h-8 w-32 rounded animate-pulse" style={{ background: "var(--border-primary)" }} />
            </div>
          ))}
        </div>

        {/* Main Dashboard Skeleton */}
        <div 
          className="rounded-2xl p-4 md:p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="relative w-10 h-10 rounded-full"
              style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))" }}
            >
              <div 
                className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: "var(--text-inverse)", borderRightColor: "var(--text-inverse)" }}
              />
            </div>
            <div className="flex-1">
              <div className="h-4 w-40 rounded animate-pulse mb-2" style={{ background: "var(--border-primary)" }} />
              <div className="h-3 w-56 rounded animate-pulse" style={{ background: "var(--border-primary)" }} />
            </div>
          </div>

          <SkeletonDashboard />
        </div>
      </main>

      {/* Mobile Bottom Nav Skeleton */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-between items-center px-3 py-2 backdrop-blur-md md:hidden"
        style={{
          background: "var(--nav-bg)",
          borderTop: "1px solid var(--border-primary)",
        }}
        aria-hidden="true"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 min-w-[50px] min-h-[48px] justify-center">
            <div className="h-6 w-6 rounded-full animate-pulse" style={{ background: "var(--bg-card)" }} />
            <div className="h-2 w-8 rounded animate-pulse" style={{ background: "var(--bg-card)" }} />
          </div>
        ))}
      </nav>

      {/* Status text - Screen reader only */}
      <span className="sr-only">Loading dashboard. Please wait.</span>
    </div>
  );
}
