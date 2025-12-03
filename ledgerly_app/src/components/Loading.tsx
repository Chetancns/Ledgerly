"use client";

import React from "react";

export default function Loading() {
  return (
    <div className=" flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-black/50 backdrop-blur-md border border-white/12 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div
            className="rounded-full border-4 border-t-4 border-white/20 border-t-blue-400 animate-spin"
            aria-hidden="true"
          />
          <div>
            <div className="text-white text-lg font-semibold">Loading dashboard…</div>
            <div className="text-sm text-white/70 mt-1">Hang tight — fetching your latest data.</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-20 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-20 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-20 bg-white/20 rounded-lg animate-pulse col-span-1 sm:col-span-2" />
          <div className="h-40 bg-white/20 rounded-lg animate-pulse col-span-1 sm:col-span-2" />
        </div>
      </div>
    </div>
  );
}
