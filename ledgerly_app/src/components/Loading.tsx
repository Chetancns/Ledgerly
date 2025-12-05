"use client";

import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 shadow-2xl">
        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-4">
            <div
              className="relative w-14 h-14 sm:w-16 sm:h-16"
              aria-hidden="true"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-500 to-fuchsia-500 opacity-30 blur-sm" />
              <div className="absolute inset-0 rounded-full border-2 border-white/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
            </div>
            <div>
              <div className="text-white text-xl sm:text-2xl font-semibold tracking-wide">Loading dashboard…</div>
              <div className="text-sm sm:text-base text-white/70 mt-1">Fetching your latest finance data.</div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton height="h-24" />
            <Skeleton height="h-24" />
            <Skeleton height="h-24" className="md:col-span-2" />
            <Skeleton height="h-56" className="md:col-span-2" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">Loading</span>
    </div>
  );
}

function Skeleton({ height, className = "" }: { height: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white/10 ${height} ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}
