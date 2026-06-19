import { NextRequest } from 'next/server'
import {
  readLog,
  deleteMeal,
  insertMeal,
  calculateTotals,
  todayISO,
  type LogEntry,
} from '@/lib/nutrition'
import { appendAudit, hashPayload, isWithinUndoWindow } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const date = request.nextUrl.searchParams.get('date') || todayISO()

  const body = await request.json().catch(() => ({}))
  const quantity = Number(body.quantity_grams)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return Response.json(
      { error: 'quantity_grams must be a positive number' },
      { status: 400 },
    )
  }

  const entries = await readLog(date)
  const entry = entries.find((e) => e.timestamp === id)
  if (!entry) {
    return Response.json({ error: 'Entry not found' }, { status: 404 })
  }

  // Recompute consumed macros from the meal's own per-100g snapshot, so an
  // edit stays accurate even if the food's library values changed since.
  const per100 = entry.nutrition_per_100g
  const factor = quantity / 100
  const updated: LogEntry = {
    ...entry,
    quantity_grams: quantity,
    consumed_nutrition: {
      calories: Math.round(per100.calories * factor * 10) / 10,
      protein_g: Math.round(per100.protein_g * factor * 10) / 10,
      carb_g: Math.round(per100.carb_g * factor * 10) / 10,
      fat_g: Math.round(per100.fat_g * factor * 10) / 10,
    },
  }

  // Same timestamp → replaces the meal in place (insertMeal upserts on _id).
  await insertMeal(date, updated, 'nutrition-form')

  appendAudit({
    source: 'nutrition-form',
    action: 'nutrition.update',
    target: entry.timestamp,
    payload_hash: hashPayload({ id: entry.timestamp, date, quantity_grams: quantity }),
    meta: { date, food_name: entry.food_name, grams: quantity },
  })

  const result = await readLog(date)
  return Response.json({ entries: result, totals: calculateTotals(result) })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = decodeURIComponent(rawId)
  const date = request.nextUrl.searchParams.get('date') || todayISO()
  const entries = await readLog(date)

  const entry = entries.find((e) => e.timestamp === id)
  if (!entry) {
    return Response.json({ error: 'Entry not found' }, { status: 404 })
  }

  const entryTs = new Date(entry.timestamp).getTime()
  if (!isWithinUndoWindow(entryTs)) {
    return Response.json(
      { error: 'Undo window (24h) has expired' },
      { status: 410 },
    )
  }

  const deleted = await deleteMeal(date, id)
  if (!deleted) {
    return Response.json({ error: 'Entry not found' }, { status: 404 })
  }

  appendAudit({
    source: 'nutrition-form',
    action: 'nutrition.revert',
    target: entry.timestamp,
    payload_hash: hashPayload({ id: entry.timestamp, date }),
    meta: { date, food_name: entry.food_name },
  })

  const updated = await readLog(date)
  return Response.json({ entries: updated, totals: calculateTotals(updated) })
}
