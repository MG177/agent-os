"use client";

import { forwardRef } from "react";

type SearchFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  onClear?: () => void;
};

const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { className = "", onClear, value, placeholder = "Search…", ...props },
    ref,
  ) {
    const hasValue = value != null && String(value).length > 0;

    return (
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        >
          <circle cx={11} cy={11} r={8} />
          <line x1={21} y1={21} x2={16.65} y2={16.65} />
        </svg>
        <input
          ref={ref}
          type="text"
          inputMode="search"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          className={`w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 text-sm font-medium text-slate-900 shadow-sm transition-colors placeholder:font-normal placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${onClear && hasValue ? "pr-11" : "pr-4"
            } ${className}`}
          {...props}
        />
        {onClear && hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear search"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
              aria-hidden
            >
              <line x1={18} y1={6} x2={6} y2={18} />
              <line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </button>
        )}
      </div>
    );
  },
);

export default SearchField;
