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
  theme?: "dark" | "light";
};

export default function NeumorphicSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  theme = "dark",
}: NeumorphicSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Theme styles
  const isDark = theme === "dark";

  const triggerStyle = isDark
  ? "bg-[#1d1f24] text-white shadow-[8px_8px_18px_#0e0f11,-8px_-8px_18px_#2c2f33] border-white/5"
  : "bg-[#f4f4f6] text-black shadow-[3px_3px_8px_#d8d8db,-3px_-3px_8px_#ffffff] border-black/10";

const dropdownStyle = isDark
  ? "bg-[#1d1f24] shadow-[8px_8px_18px_#0e0f11,-8px_-8px_18px_#2c2f33] border-white/10"
  : "bg-[#f4f4f6] shadow-[3px_3px_8px_#d8d8db,-3px_-3px_8px_#ffffff] border-black/10";

  const textMuted = isDark ? "text-white/40" : "text-black/40";
  const textPrimary = isDark ? "text-white" : "text-black";

  const highlightBg = isDark ? "bg-white/5" : "bg-black/5";
  const selectedBg = isDark ? "bg-white/10" : "bg-black/10";

  // Outside click closes
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between border transition ${triggerStyle}`}
      >
        <span className={selected ? textPrimary : textMuted}>
          {selected || placeholder}
        </span>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <ChevronDown className={`w-5 h-5 ${textMuted}`} />
        </motion.div>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className={`absolute left-0 mt-3 w-full rounded-2xl z-[51] overflow-hidden ${dropdownStyle}`}
          >
            {/* Search */}
            <div
              className={`flex items-center gap-2 px-4 py-3 border-b ${
                isDark ? "border-white/10 bg-black/10" : "border-black/10 bg-black/5"
              }`}
            >
              <Search className={`w-4 h-4 ${textMuted}`} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder="Search..."
                className={`w-full bg-transparent outline-none ${textPrimary} placeholder:${textMuted}`}
              />
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto thin-scrollbar">
              {filtered.map((o, i) => (
                <motion.div
                  key={o.value}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between select-none transition
                    ${
                      value === o.value
                        ? `${selectedBg} ${textPrimary}`
                        : isDark ? "text-white/70" : "text-black/70"
                    }
                    ${highlightIndex === i ? highlightBg : ""}
                    hover:${highlightBg}
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
                <div className={`px-4 py-3 text-sm ${textMuted}`}>
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
