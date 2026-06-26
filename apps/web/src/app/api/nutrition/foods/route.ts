import { NextRequest } from 'next/server'
import { readFoodDb, upsertFood } from '@agent-os/platform/nutrition'

export async function GET() {
  const db = await readFoodDb()
  const foods = Object.entries(db).map(([key, entry]) => ({ key, ...entry }))
  return Response.json({ foods, count: foods.length })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { food_name, per_100g } = body

  if (!food_name || !per_100g) {
    return Response.json({ error: 'food_name and per_100g are required' }, { status: 400 })
  }

  const required = ['calories', 'protein_g', 'carb_g', 'fat_g']
  for (const field of required) {
    if (per_100g[field] === undefined) {
      return Response.json({ error: `per_100g.${field} is required` }, { status: 400 })
    }
  }

  const key = food_name.trim().toLowerCase()
  const entry = {
    display_name: food_name.trim(),
    per_100g,
    added_date: new Date().toISOString(),
  }
  await upsertFood(key, entry)

  return Response.json({ key, entry }, { status: 201 })
}
