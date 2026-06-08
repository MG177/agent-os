import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-2xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-blue-200 hover:bg-[oklch(0.488_0.217_264.376)]",
        outline:
          "border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 aria-expanded:bg-slate-50",
        secondary:
          "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 aria-expanded:bg-slate-50",
        ghost:
          "text-slate-500 hover:bg-slate-100 hover:text-slate-700 aria-expanded:bg-slate-100",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
        chip:
          "min-h-11 rounded-full border-slate-200 bg-white px-4 font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 data-[state=on]:border-blue-600 data-[state=on]:bg-blue-50 data-[state=on]:font-semibold data-[state=on]:text-blue-700",
        "chip-blue":
          "gap-2 rounded-full border-blue-200 bg-blue-50 px-4 font-semibold text-blue-800 shadow-sm hover:border-blue-300 hover:bg-blue-100",
        "chip-emerald":
          "gap-2 rounded-full border-emerald-200 bg-emerald-50 px-4 font-semibold text-emerald-800 shadow-sm hover:border-emerald-300 hover:bg-emerald-100",
        "chip-violet":
          "gap-2 rounded-full border-violet-200 bg-violet-50 px-4 font-semibold text-violet-800 shadow-sm hover:border-violet-300 hover:bg-violet-100",
        "chip-indigo":
          "gap-2 rounded-full border-indigo-200 bg-indigo-50 px-4 font-semibold text-indigo-800 shadow-sm hover:border-indigo-300 hover:bg-indigo-100",
      },
      size: {
        default:
          "min-h-11 gap-1.5 px-4 py-3 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
