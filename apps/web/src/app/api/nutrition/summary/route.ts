import { NextRequest } from 'next/server'
import { readLog, readGoals, calculateTotals, todayISO } from '@/lib/nutrition'

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || todayISO()
  const entries = await readLog(date)
  const totals = calculateTotals(entries)
  const goals = await readGoals()

  return Response.json({
    date,
    totals,
    goals,
    remaining: {
      calories: Math.max(0, goals.calories - totals.calories),
      protein_g: Math.max(0, goals.protein_g - totals.protein_g),
      carb_g: Math.max(0, goals.carb_g - totals.carb_g),
      fat_g: Math.max(0, goals.fat_g - totals.fat_g),
    },
    progress: {
      calories: Math.min(1, totals.calories / goals.calories),
      protein_g: Math.min(1, totals.protein_g / goals.protein_g),
      carb_g: Math.min(1, totals.carb_g / goals.carb_g),
      fat_g: Math.min(1, totals.fat_g / goals.fat_g),
    },
  })
}
