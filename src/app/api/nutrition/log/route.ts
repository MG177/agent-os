import { NextRequest } from 'next/server'
import {
  readLog,
  insertMeal,
  readFoodDb,
  calculateTotals,
  todayISO,
  type LogEntry,
} from '@/lib/nutrition'
import { appendAudit, hashPayload, type AuditSource } from '@/lib/audit'

const ALLOWED_SOURCES: AuditSource[] = ['nutrition-form', 'nutrition-chat']

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || todayISO()
  const entries = await readLog(date)
  return Response.json({ date, entries, totals: calculateTotals(entries) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { food_name, quantity_grams, nutrition_per_100g: overrideNutrition, source } = body

  if (!food_name || !quantity_grams) {
    return Response.json({ error: 'food_name and quantity_grams are required' }, { status: 400 })
  }

  const resolvedSource: AuditSource =
    source && ALLOWED_SOURCES.includes(source as AuditSource)
      ? (source as AuditSource)
      : 'nutrition-form'

  let nutrition = overrideNutrition
  if (!nutrition) {
    const db = await readFoodDb()
    const key = food_name.trim().toLowerCase()
    const dbEntry = db[key]
    if (!dbEntry) {
      return Response.json({ error: `Food "${food_name}" not found in database. Provide nutrition_per_100g.` }, { status: 404 })
    }
    nutrition = dbEntry.per_100g
  }

  const factor = quantity_grams / 100
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    food_name: food_name.trim(),
    quantity_grams,
    nutrition_per_100g: nutrition,
    consumed_nutrition: {
      calories: Math.round(nutrition.calories * factor * 10) / 10,
      protein_g: Math.round(nutrition.protein_g * factor * 10) / 10,
      carb_g: Math.round(nutrition.carb_g * factor * 10) / 10,
      fat_g: Math.round(nutrition.fat_g * factor * 10) / 10,
    },
  }

  const date = todayISO()
  await insertMeal(date, entry, resolvedSource)

  appendAudit({
    source: resolvedSource,
    action: 'nutrition.create',
    target: entry.timestamp,
    payload_hash: hashPayload(entry),
    meta: { date, food_name: entry.food_name, grams: entry.quantity_grams },
  })

  const entries = await readLog(date)
  return Response.json({ entry, totals: calculateTotals(entries) }, { status: 201 })
}
