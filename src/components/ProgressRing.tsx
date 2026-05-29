'use client'

interface ProgressRingProps {
  value: number
  max: number
  color: string
  trackColor?: string
  size?: number
  strokeWidth?: number
  label?: string
  unit?: string
  children?: React.ReactNode
}

export default function ProgressRing({
  value,
  max,
  color,
  trackColor = '#e2e8f0',
  size = 88,
  strokeWidth = 10,
  label,
  unit,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(1, max > 0 ? value / max : 0)
  const offset = circumference * (1 - pct)
  const center = size / 2

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle
            cx={center} cy={center} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children ?? (
            <>
              <span className="text-sm font-bold text-slate-800 leading-none tabular-nums">{Math.round(value)}</span>
              {unit && <span className="text-[10px] text-slate-400 mt-0.5">{unit}</span>}
            </>
          )}
        </div>
      </div>
      {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
      {unit && !children && <span className="text-[10px] text-slate-400 -mt-1">/ {max}{unit}</span>}
    </div>
  )
}
