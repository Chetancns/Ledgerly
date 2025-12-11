import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find((o) => o.value === value)?.label;

  // Modern theme-aware styles
  const isDark = theme === "dark";

  const triggerStyle = isDark
    ? "bg-slate-800/80 backdrop-blur-lg border-slate-700/60 text-white shadow-lg shadow-black/20 hover:bg-slate-800/90 hover:border-slate-600"
    : "bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg border-slate-200/50 text-slate-900 shadow-lg shadow-black/5 hover:from-white/90 hover:to-white/70 hover:border-slate-300";

  const dropdownStyle = isDark
    ? "bg-slate-800/80 backdrop-blur-xl border-slate-700/60 shadow-2xl shadow-black/40"
    : "bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl border-slate-200/60 shadow-2xl shadow-black/10";

  const textMuted = isDark ? "text-white/50" : "text-slate-500";
  const textPrimary = isDark ? "text-white" : "text-slate-900";

  const highlightBg = isDark ? "bg-white/8" : "bg-slate-100";
  const selectedBg = isDark ? "bg-white/12" : "bg-slate-200/50";
  const dividerColor = isDark ? "border-white/10" : "border-slate-200/50";

  // compute portal position when opening + on resize/scroll
  useEffect(() => {
    if (!open) {
      setPortalPosition(null);
      return;
    }
    const updatePosition = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setPortalPosition({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    };

    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, options.length, search]);

  // Outside click closes. Check both trigger ref and portal dropdown ref.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideTrigger = ref.current && ref.current.contains(target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      if (!clickedInsideTrigger && !clickedInsideDropdown) {
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
        e.preventDefault();
        setHighlightIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev === 0 ? (filtered.length ? filtered.length - 1 : 0) : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const picked = filtered[highlightIndex];
        if (picked) {
          onChange(picked.value);
          setOpen(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, highlightIndex, onChange]);

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`w-full px-4 py-3 rounded-xl flex items-center justify-between border font-medium transition-all ${triggerStyle}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? textPrimary : textMuted}>
          {selected || placeholder}
        </span>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex-shrink-0"
        >
          <ChevronDown className={`w-5 h-5 ${textMuted}`} />
        </motion.div>
      </motion.button>

      {/* Dropdown Portal */}
      {typeof document !== "undefined" && portalPosition && open
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: portalPosition.top,
                left: portalPosition.left,
                width: portalPosition.width,
                zIndex: 9999,
              }}
            >
              <AnimatePresence>
                {/* backdrop with blur */}
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                  style={{ zIndex: 9998 }}
                />
              </AnimatePresence>

              <AnimatePresence>
                <motion.div
                  key="dropdown"
                  initial={{ opacity: 0, scaleY: 0.95, y: -8 }}
                  animate={{ opacity: 1, scaleY: 1, y: 0 }}
                  exit={{ opacity: 0, scaleY: 0.95, y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`w-full rounded-2xl overflow-hidden border transition-all ${dropdownStyle}`}
                  style={{ position: "absolute", zIndex: 10001, top: 0, left: 0 }}
                >
                  {/* Search */}
                  <div
                    className={`flex items-center gap-2 px-4 py-3 border-b ${dividerColor} backdrop-blur-sm`}
                  >
                    <Search className={`w-4 h-4 flex-shrink-0 ${textMuted}`} />
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setHighlightIndex(0);
                      }}
                      placeholder="Search..."
                      className={`w-full bg-transparent outline-none text-sm font-medium ${textPrimary} placeholder:${textMuted}`}
                      autoFocus
                    />
                  </div>

                  {/* Options */}
                  <div className="max-h-64 overflow-y-auto">
                    {filtered.map((o, i) => (
                      <motion.div
                        key={o.value}
                        className={`px-4 py-3 cursor-pointer flex items-center justify-between select-none transition-colors
                          ${
                            value === o.value
                              ? `${selectedBg} font-semibold ${textPrimary}`
                              : `${textPrimary} hover:${highlightBg}`
                          }
                          ${highlightIndex === i ? highlightBg : ""}
                        `}
                        onMouseEnter={() => setHighlightIndex(i)}
                        onClick={() => {
                          onChange(o.value);
                          setOpen(false);
                          setSearch("");
                        }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "tween", duration: 0.15 }}
                      >
                        {o.label}
                        {value === o.value && (
                          <motion.div
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <Check className="w-4 h-4 text-emerald-500" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}

                    {filtered.length === 0 && (
                      <div className={`px-4 py-6 text-center text-sm ${textMuted}`}>
                        No results found
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}