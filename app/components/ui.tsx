import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Tension Score Component ──
interface TensionScoreProps {
  score: number;
  signalsFired?: string[];
  size?: "sm" | "md" | "lg";
  className?: string;
  showSignals?: boolean;
}

export function TensionScore({ score, signalsFired = [], size = "md", className, showSignals = true }: TensionScoreProps) {
  const level = score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";
  
  const colors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };
  
  const iconSize = size === "sm" ? 14 : size === "md" ? 16 : 20;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-semibold rounded-full border",
            colors[level],
            size === "sm" ? "px-2 py-0.5 text-xs" : size === "md" ? "px-2.5 py-1 text-sm" : "px-3 py-1.5 text-base"
          )}
        >
          {level === "high" && <AlertCircle size={iconSize} />}
          {level === "medium" && <AlertTriangle size={iconSize} />}
          {level === "low" && <CheckCircle size={iconSize} />}
          {(score * 100).toFixed(0)}% Tension
        </span>
      </div>
      
      {showSignals && signalsFired.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {signalsFired.map((signal, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
            >
              {signal}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reusable Loading State ──
export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-gray-500 min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ── Reusable Error State ──
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-red-600 min-h-[50vh]">
      <AlertCircle size={48} className="mb-4 opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-sm text-red-500 mb-6 text-center max-w-md">{error.message}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ── Empty State ──
export function EmptyState({ title, description, icon: Icon = AlertCircle }: { title: string, description: string, icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-gray-500 min-h-[30vh] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
      <Icon size={48} className="mb-4 opacity-40 text-gray-400" />
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm">{description}</p>
    </div>
  );
}
