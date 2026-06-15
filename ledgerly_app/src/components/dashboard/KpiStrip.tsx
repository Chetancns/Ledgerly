import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ReactNode, useEffect, useState } from "react";

type SparklinePoint = {
  label: string;
  value: number;
};

type KpiCard = {
  id: string;
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  formatAs?: "currency" | "percent";
  sparkline: SparklinePoint[];
  accent: string;
};

function AnimatedMetric({
  value,
  formatAs = "currency",
}: {
  value: number;
  formatAs?: "currency" | "percent";
}) {
  const { format } = useCurrencyFormatter();
  const motionValue = useMotionValue(0);
  const transformed = useTransform(motionValue, (latest) => latest);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: "easeOut",
    });
    const unsubscribe = transformed.on("change", (latest) => {
      setDisplayValue(latest);
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [motionValue, transformed, value]);

  if (formatAs === "percent") {
    return <>{displayValue.toFixed(1)}%</>;
  }

  return <>{format(displayValue)}</>;
}

export default function KpiStrip({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08, duration: 0.35 }}
          whileHover={{ y: -2, boxShadow: "var(--shadow-lg)" }}
          className="dashboard-surface relative overflow-hidden p-4 sm:p-5"
        >
          <div className="absolute inset-x-0 bottom-0 h-20 opacity-70">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={card.sparkline}>
                <defs>
                  <linearGradient id={`${card.id}-spark`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={card.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={card.accent} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="value"
                  type="monotone"
                  stroke={card.accent}
                  strokeWidth={2}
                  fill={`url(#${card.id}-spark)`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                  <AnimatedMetric value={card.value} formatAs={card.formatAs} />
                </p>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                style={{
                  background: "var(--accent-soft)",
                  borderColor: "var(--border-primary)",
                  color: card.accent,
                }}
              >
                {card.icon}
              </div>
            </div>
            <p className="mt-5 text-sm text-[var(--text-secondary)]">{card.helper}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
