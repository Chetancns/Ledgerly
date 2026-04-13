import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search } from "lucide-react";
import { createPortal } from "react-dom";

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
  const ref = useRef<HTMLDivElement | null>(null); // trigger container ref
  const dropdownRef = useRef<HTMLDivElement | null>(null); // dropdown node ref in portal

  // portal position (fixed coordinates relative to viewport)
  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Theme styles - Use CSS custom properties for Arctic theme consistency
  const isDark = theme === "dark";

  const triggerStyle = isDark
    ? "shadow-[6px_6px_14px_#020810,-6px_-6px_14px_#0c1a2e]"
    : "shadow-[4px_4px_10px_#c8dded,-4px_-4px_10px_#ffffff]";

  const dropdownStyle = isDark
    ? "shadow-[8px_8px_18px_#020810,-8px_-8px_18px_#0c1a2e]"
    : "shadow-[4px_4px_10px_#c8dded,-4px_-4px_10px_#ffffff]";

  const textMuted = "opacity-60";
  const textPrimary = "";

  const highlightBg = isDark ? "bg-white/5" : "bg-[rgba(14,59,111,0.06)]";
  const selectedBg = isDark ? "bg-white/10" : "bg-[rgba(14,59,111,0.1)]";

  // compute portal position when opening + on resize/scroll
  useEffect(() => {
    if (!open) {
      setPortalPosition(null);
      return;
    }
    const updatePosition = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      // using position: fixed for portal so use rect coordinates relative to viewport
      setPortalPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    };

    updatePosition();
    const onResize = () => updatePosition();
    // use capture scroll listener to catch ancestor scrolls too
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

  const selected = options.find((o) => o.value === value)?.label;

  // Dropdown content (rendered into portal when open)
  const dropdownNode = open && portalPosition
    ? (
      <div
        ref={dropdownRef}
        // inline styles for positioning the portal dropdown
        style={{
          position: "fixed",
          top: portalPosition.top,
          left: portalPosition.left,
          width: portalPosition.width,
          zIndex: 9999,
        }}
      >
        {/* Backdrop (in portal so it sits behind the menu but above page content) */}
        <AnimatePresence>
          {/* backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            style={{ zIndex: 9998 }}
          />
        </AnimatePresence>

        <AnimatePresence>
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className={`rounded-2xl overflow-visible ${dropdownStyle}`}
            style={{ 
              position: "absolute", 
              zIndex: 10001, 
              top: 0, 
              left: 0,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-primary)",
              backdropFilter: 'blur(12px)',
              color: "var(--input-text)",
            }}
          >
            {/* Search */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "var(--border-primary)" }}
            >
              <Search className="w-4 h-4 opacity-50" style={{ color: "var(--input-text)" }} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder="Search..."
                className="w-full bg-transparent outline-none placeholder:opacity-50"
                style={{ color: "var(--input-text)" }}
                autoFocus
              />
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto thin-scrollbar">
              {filtered.map((o, i) => (
                <motion.div
                  key={o.value}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between select-none transition
                    ${value === o.value ? selectedBg : ""}
                    ${highlightIndex === i ? highlightBg : ""}
                  `}
                  style={{ color: value === o.value ? "var(--accent-primary)" : "var(--text-secondary)" }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                  {value === o.value && <Check className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />}
                </motion.div>
              ))}

              {filtered.length === 0 && (
                <div className="px-4 py-3 text-sm opacity-50" style={{ color: "var(--input-text)" }}>
                  No results
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
    : null;

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between border transition ${triggerStyle}`}
        style={{ 
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          color: "var(--input-text)",
          backdropFilter: 'blur(12px)',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "" : "opacity-50"} style={{ color: "var(--input-text)" }}>
          {selected || placeholder}
        </span>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <ChevronDown className="w-5 h-5 opacity-50" style={{ color: "var(--input-text)" }} />
        </motion.div>
      </button>

      {/* Render dropdown into document.body to avoid stacking-context issues */}
      {typeof document !== "undefined" && portalPosition
        ? createPortal(dropdownNode, document.body)
        : null}
    </div>
  );
}