"use client";

import { forwardRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <Search
          strokeWidth={2}
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <Input
          ref={ref}
          type="text"
          inputMode="search"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          className={cn(
            "border border-slate-200 bg-white py-3 pl-11 font-medium text-slate-900 shadow-sm placeholder:font-normal placeholder:text-slate-500 focus:border-blue-500 focus:bg-white focus-visible:ring-blue-500/25",
            onClear && hasValue ? "pr-11" : "pr-4",
            className,
          )}
          {...props}
        />
        {onClear && hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg text-slate-400 hover:text-slate-700"
            aria-label="Clear search"
          >
            <X strokeWidth={2} className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    );
  },
);

export default SearchField;
