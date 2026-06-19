import { NextRequest } from 'next/server'
import { readGoals, writeGoals } from '@agent-os/platform/nutrition'

export async function GET() {
  return Response.json(await readGoals())
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const current = await readGoals()
  const updated = { ...current, ...body }

  const required = ['calories', 'protein_g', 'carb_g', 'fat_g']
  for (const field of required) {
    if (typeof updated[field as keyof typeof updated] !== 'number') {
      return Response.json({ error: `${field} must be a number` }, { status: 400 })
    }
  }

  await writeGoals(updated)
  return Response.json(updated)
}
