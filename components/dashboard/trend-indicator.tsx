import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendChange, TrendDirection } from "@/lib/governance/trends";

interface TrendIndicatorProps {
  label: string;
  current: number;
  change: TrendChange;
  invertColors?: boolean;
}

function directionTone(
  direction: TrendDirection,
  invertColors: boolean
): "positive" | "negative" | "neutral" {
  if (direction === "flat") return "neutral";
  const isIncrease = direction === "up";
  const isGood = invertColors ? isIncrease : !isIncrease;
  return isGood ? "positive" : "negative";
}

const toneClasses = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  neutral: "text-muted-foreground",
};

export function TrendIndicator({
  label,
  current,
  change,
  invertColors = false,
}: TrendIndicatorProps) {
  const tone = directionTone(change.direction, invertColors);
  const Icon =
    change.direction === "up"
      ? TrendingUp
      : change.direction === "down"
        ? TrendingDown
        : Minus;

  const deltaLabel =
    change.delta === 0
      ? "No change"
      : `${change.delta > 0 ? "+" : ""}${change.delta}${
          change.percentChange !== null ? ` (${change.percentChange > 0 ? "+" : ""}${change.percentChange}%)` : ""
        }`;

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{current}</p>
      <div className={cn("flex items-center gap-1 mt-2 text-sm font-medium", toneClasses[tone])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{deltaLabel}</span>
      </div>
    </div>
  );
}
