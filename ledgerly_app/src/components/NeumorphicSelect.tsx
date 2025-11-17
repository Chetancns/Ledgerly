import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search } from "lucide-react";

export type SelectOption = {
  label: string;
  value: string;
};

type NeumorphicSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
};

export default function NeumorphicSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
}: NeumorphicSelectProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [highlightIndex, setHighlightIndex] = useState<number>(0);
  const ref = useRef<HTMLDivElement | null>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        setHighlightIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        setHighlightIndex((prev) =>
          prev === 0 ? filtered.length - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        const picked = filtered[highlightIndex];
        if (picked) {
          onChange(picked.value);
          setOpen(false);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, highlightIndex, onChange]);

  const selected = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button type="button" 
        onClick={() => setOpen((o) => !o)}
        className="
          w-full px-4 py-3 rounded-2xl text-white/90 bg-[#1d1f24]
          shadow-[8px_8px_20px_#0e0f11,-8px_-8px_20px_#2c2f33]
          border border-white/5 flex items-center justify-between
          transition active:shadow-[inset_6px_6px_14px_#0e0f11,inset_-6px_-6px_14px_#2c2f33]
        "
      >
        <span className={selected ? "text-white" : "text-white/40"}>
          {selected || placeholder}
        </span>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 240 }}
        >
          <ChevronDown className="w-5 h-5 text-white/70" />
        </motion.div>
      </button>

      {/* Dropdown List */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="
              absolute left-0 mt-3 w-full rounded-2xl z-50 overflow-hidden
              bg-[#1d1f24] shadow-[8px_8px_20px_#0e0f11,-8px_-8px_20px_#2c2f33]
              border border-white/10
            "
          >
            {/* Search Bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/10 backdrop-blur-sm">
              <Search className="w-4 h-4 text-white/40" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder="Search..."
                className="w-full bg-transparent outline-none text-white placeholder-white/40"
              />
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto thin-scrollbar">
              {filtered.map((o, i) => (
                <motion.div
                  key={o.value}
                  className={`
                    px-4 py-3 cursor-pointer flex items-center justify-between
                    transition select-none
                    ${
                      value === o.value
                        ? "bg-white/10 text-white"
                        : "text-white/70"
                    }
                    ${highlightIndex === i ? "bg-white/5" : ""}
                    hover:bg-white/5
                  `}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                  {value === o.value && <Check className="w-4 h-4" />}
                </motion.div>
              ))}

              {filtered.length === 0 && (
                <div className="px-4 py-3 text-white/50 text-sm">
                  No results
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
