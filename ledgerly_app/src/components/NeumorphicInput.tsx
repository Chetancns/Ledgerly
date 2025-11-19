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

  const baseBg = isDark ? "bg-[#1d1f24] text-white" : "bg-[#f4f4f6] text-black";
  const softShadow = isDark
    ? "shadow-[6px_6px_14px_#0e0f11,-6px_-6px_14px_#2c2f33]"
    : "shadow-[4px_4px_10px_#d1d1d4,-4px_-4px_10px_#ffffff]";

  const focusShadow = isDark
    ? "shadow-[inset_4px_4px_10px_#0e0f11,inset_-4px_-4px_10px_#2c2f33]"
    : "shadow-[inset_3px_3px_8px_#d1d1d4,inset_-3px_-3px_8px_#ffffff]";

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
          ${baseBg} ${softShadow}
          placeholder:${isDark ? "text-white/40" : "text-black/40"}
          transition-all duration-200
        `}
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
