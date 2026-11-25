import React from "react";
import { Card } from "@/components/ui/Card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "blue" | "emerald" | "amber" | "rose" | "purple";
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "blue",
  onClick,
}: StatCardProps) {
  const variantStyles = {
    blue: {
      iconBg: "bg-blue-50 text-blue-600",
      accent: "border-blue-100/60 hover:border-blue-300",
      indicator: "bg-blue-500",
    },
    emerald: {
      iconBg: "bg-emerald-50 text-emerald-600",
      accent: "border-emerald-100/60 hover:border-emerald-300",
      indicator: "bg-emerald-500",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600",
      accent: "border-amber-100/60 hover:border-amber-300",
      indicator: "bg-amber-500",
    },
    rose: {
      iconBg: "bg-rose-50 text-rose-600",
      accent: "border-rose-100/60 hover:border-rose-300",
      indicator: "bg-rose-500",
    },
    purple: {
      iconBg: "bg-purple-50 text-purple-600",
      accent: "border-purple-100/60 hover:border-purple-300",
      indicator: "bg-purple-500",
    },
  };

  const style = variantStyles[variant];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-5 flex flex-col justify-between transition-all duration-200 border",
        style.accent,
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{value}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm", style.iconBg)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {subtitle && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", style.indicator)} />
          <p className="text-xs font-medium text-slate-500 truncate">{subtitle}</p>
        </div>
      )}
    </Card>
  );
}
