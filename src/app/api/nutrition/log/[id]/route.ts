import { NextRequest } from 'next/server'
import { readLog, deleteMeal, calculateTotals, todayISO } from '@/lib/nutrition'
import { appendAudit, hashPayload, isWithinUndoWindow } from '@/lib/audit'

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
