"use client";

import React from "react";
import { SkeletonDashboard } from "./Skeleton";

export default function Loading() {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
    >
      <div 
        className="w-full max-w-3xl rounded-3xl shadow-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-primary)",
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="relative w-12 h-12 sm:w-14 sm:h-14"
              aria-hidden="true"
            >
              <div 
                className="absolute inset-0 rounded-full opacity-30 blur-sm"
                style={{ background: "linear-gradient(to top right, var(--color-info), var(--accent-secondary), var(--accent-primary))" }}
              />
              <div 
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: "var(--border-primary)" }}
              />
              <div 
                className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: "var(--color-info)" }}
              />
            </div>
            <div>
              <div 
                className="text-lg sm:text-xl font-semibold tracking-wide"
                style={{ color: "var(--text-primary)" }}
              >
                Loading dashboard…
              </div>
              <div 
                className="text-sm sm:text-base mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Fetching your latest finance data.
              </div>
            </div>
          </div>

          <SkeletonDashboard />
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">Loading</span>
    </div>
  );
}
