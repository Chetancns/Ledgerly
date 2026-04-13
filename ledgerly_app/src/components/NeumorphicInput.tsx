import { motion } from "framer-motion";

type NeumorphicInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  theme?: "dark" | "light";
};

export default function NeumorphicInput({
  value,
  onChange,
  placeholder = "",
  type = "text",
  theme = "dark",
}: NeumorphicInputProps) {
  const isDark = theme === "dark";

  const softShadow = isDark
    ? "shadow-[6px_6px_14px_#020810,-6px_-6px_14px_#0c1a2e]"
    : "shadow-[4px_4px_10px_#c0d4e6,-4px_-4px_10px_#f0f8ff]";

  const focusShadow = isDark
    ? "shadow-[inset_4px_4px_10px_#020810,inset_-4px_-4px_10px_#0c1a2e]"
    : "shadow-[inset_3px_3px_8px_#c0d4e6,inset_-3px_-3px_8px_#f0f8ff]";

  return (
    <motion.div
      initial={false}
      animate={{ scale: value ? 1.01 : 1 }} // optional micro animation
      transition={{ type: "spring", stiffness: 250, damping: 20 }}
      className="
        w-full rounded-2xl transition-all duration-200
      "
    >
      <motion.input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
            if (e.key === "Enter") {
            e.preventDefault(); // ⛔️ stops form submission
            }
        }}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3 rounded-2xl outline-none
          ${softShadow}
          transition-all duration-200
        `}
        style={{
          background: isDark ? 'rgba(148, 197, 233, 0.07)' : 'var(--input-bg)',
          color: 'var(--input-text)',
          backdropFilter: 'blur(12px)'
        }}
        whileFocus={{
          scale: 1.015,
        }}
        onFocus={(e) => {
          e.currentTarget.classList.add(...focusShadow.split(" "));
        }}
        onBlur={(e) => {
          e.currentTarget.classList.remove(...focusShadow.split(" "));
        }}
      />
    </motion.div>
  );
}
