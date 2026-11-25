import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  prefixText?: string;
  suffixText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightElement,
      prefixText,
      suffixText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">
            {label} {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="relative flex items-center rounded-xl shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          {prefixText && (
            <span className="inline-flex items-center px-3 text-slate-500 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl h-11 text-sm font-medium">
              {prefixText}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
              "w-full h-11 px-3.5 text-base bg-white border border-slate-300 text-slate-900 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
              leftIcon && "pl-11",
              prefixText && "rounded-l-none",
              suffixText && "rounded-r-none",
              rightElement && "pr-12",
              error && "border-red-400 focus:border-red-500 focus:ring-red-200",
              className
            )}
            {...props}
          />
          {suffixText && (
            <span className="inline-flex items-center px-3 text-slate-500 bg-slate-100 border border-l-0 border-slate-300 rounded-r-xl h-11 text-sm font-medium">
              {suffixText}
            </span>
          )}
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
