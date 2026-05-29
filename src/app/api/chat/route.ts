import { NextRequest } from 'next/server'
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from '@google/generative-ai'
import {
  readLog, readFoodDb, upsertFood, readGoals, insertMeal, calculateTotals, todayISO,
  LogEntry, NutritionPer100g,
} from '@/lib/nutrition'
import { appendAudit, hashPayload } from '@/lib/audit'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'log_food',
    description: 'Log a food entry for today. Call this whenever the user mentions eating or drinking something.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        food_name: { type: SchemaType.STRING, description: 'Name of the food' },
        quantity_grams: { type: SchemaType.NUMBER, description: 'Quantity in grams' },
        nutrition_per_100g: {
          type: SchemaType.OBJECT,
          description: 'Nutrition per 100g — provide this if the food is not in the database or extracted from an image',
          properties: {
            calories: { type: SchemaType.NUMBER },
            protein_g: { type: SchemaType.NUMBER },
            carb_g: { type: SchemaType.NUMBER },
            fat_g: { type: SchemaType.NUMBER },
            fiber_g: { type: SchemaType.NUMBER },
            sugar_g: { type: SchemaType.NUMBER },
          },
          required: ['calories', 'protein_g', 'carb_g', 'fat_g'],
        },
      },
      required: ['food_name', 'quantity_grams'],
    },
  },
  {
    name: 'get_daily_summary',
    description: "Get the user's nutrition summary for today: totals eaten, goals, and remaining macros.",
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
  },
  {
    name: 'search_food_db',
    description: 'Search the food database by name to find stored nutrition info.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: { query: { type: SchemaType.STRING, description: 'Food name to search for' } },
      required: ['query'],
    },
  },
  {
    name: 'add_food_to_db',
    description: 'Save a new food to the database for quick future logging.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        food_name: { type: SchemaType.STRING },
        per_100g: {
          type: SchemaType.OBJECT,
          properties: {
            calories: { type: SchemaType.NUMBER },
            protein_g: { type: SchemaType.NUMBER },
            carb_g: { type: SchemaType.NUMBER },
            fat_g: { type: SchemaType.NUMBER },
            fiber_g: { type: SchemaType.NUMBER },
            sugar_g: { type: SchemaType.NUMBER },
          },
          required: ['calories', 'protein_g', 'carb_g', 'fat_g'],
        },
      },
      required: ['food_name', 'per_100g'],
    },
  },
]

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === 'get_daily_summary') {
    const date = todayISO()
    const entries = await readLog(date)
    const totals = calculateTotals(entries)
    const goals = await readGoals()
    return {
      date, totals, goals,
      remaining: {
        calories: Math.max(0, goals.calories - totals.calories),
        protein_g: Math.max(0, goals.protein_g - totals.protein_g),
        carb_g: Math.max(0, goals.carb_g - totals.carb_g),
        fat_g: Math.max(0, goals.fat_g - totals.fat_g),
      },
      meals: entries.map(e => ({ name: e.food_name, grams: e.quantity_grams, kcal: e.consumed_nutrition.calories })),
    }
  }

  if (name === 'search_food_db') {
    const query = (args.query as string).toLowerCase()
    const db = await readFoodDb()
    const results = Object.entries(db)
      .filter(([key, e]) => key.includes(query) || e.display_name.toLowerCase().includes(query))
      .slice(0, 5)
      .map(([key, e]) => ({ key, ...e }))
    return { results, count: results.length }
  }

  if (name === 'add_food_to_db') {
    const key = (args.food_name as string).trim().toLowerCase()
    await upsertFood(key, {
      display_name: (args.food_name as string).trim(),
      per_100g: args.per_100g as NutritionPer100g,
      added_date: new Date().toISOString(),
    })
    return { success: true, key }
  }

  if (name === 'log_food') {
    const food_name = args.food_name as string
    const quantity_grams = args.quantity_grams as number
    const overrideNutrition = args.nutrition_per_100g as NutritionPer100g | undefined

    let nutrition = overrideNutrition
    if (!nutrition) {
      const db = await readFoodDb()
      const key = food_name.trim().toLowerCase()
      const found = db[key]
      if (!found) return { error: `"${food_name}" not in database. Please provide nutrition_per_100g.` }
      nutrition = found.per_100g
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
    await insertMeal(date, entry, 'nutrition-chat')
    const entries = await readLog(date)
    const totals = calculateTotals(entries)

    appendAudit({
      source: 'nutrition-chat',
      action: 'nutrition.create',
      target: entry.timestamp,
      payload_hash: hashPayload(entry),
      meta: { date, food_name: entry.food_name, grams: entry.quantity_grams },
    })

    return { success: true, logged: entry.consumed_nutrition, totals }
  }

  return { error: 'Unknown tool' }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, image } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      image?: { base64: string; mediaType: string }
    }

    // Build system prompt with today's nutrition context
    const date = todayISO()
    const entries = await readLog(date)
    const totals = calculateTotals(entries)
    const goals = await readGoals()
    const remaining = {
      calories: Math.max(0, goals.calories - totals.calories),
      protein_g: Math.max(0, goals.protein_g - totals.protein_g),
      carb_g: Math.max(0, goals.carb_g - totals.carb_g),
      fat_g: Math.max(0, goals.fat_g - totals.fat_g),
    }

    const now = new Date()
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })

    const systemInstruction = `You are a friendly and efficient nutrition assistant integrated with the user's personal tracker.

Today: ${date} (${dayName})
Goals: ${goals.calories} kcal · ${goals.protein_g}g protein · ${goals.carb_g}g carbs · ${goals.fat_g}g fat
Consumed: ${totals.calories} kcal · ${totals.protein_g}g protein · ${totals.carb_g}g carbs · ${totals.fat_g}g fat
Remaining: ${remaining.calories} kcal · ${remaining.protein_g}g protein · ${remaining.carb_g}g carbs · ${remaining.fat_g}g fat
Meals logged today: ${totals.meal_count}

Rules:
- When the user mentions eating/drinking, immediately call log_food. Never ask for confirmation.
- For nutrition label images: read ALL values shown and call log_food with nutrition_per_100g.
- For food photos without labels: estimate nutrition based on visible food type/portion, then log.
- Always provide nutrition_per_100g when logging (use estimates if needed — never fail silently).
- Be concise. After logging: confirm food name, grams, and calories in one short line.
- For summaries: show totals vs goals clearly, highlight remaining macros.`

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    })

    // Build chat history (all messages except the last user message)
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })

    // Build the current user message parts
    const lastMsg = messages[messages.length - 1]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userParts: any[] = []
    if (image) {
      userParts.push({ inlineData: { mimeType: image.mediaType, data: image.base64 } })
    }
    userParts.push({ text: lastMsg.content || 'Please analyze this image.' })

    // Agentic loop: resolve all tool calls before streaming
    let finalText = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentParts: any[] = userParts

    for (let i = 0; i < 8; i++) {
      const result = await chat.sendMessage(currentParts)
      const response = result.response
      const functionCalls = response.functionCalls()

      if (!functionCalls || functionCalls.length === 0) {
        finalText = response.text()
        break
      }

      // Execute all tool calls
      currentParts = await Promise.all(
        functionCalls.map(async (call) => ({
          functionResponse: {
            name: call.name,
            response: await executeTool(call.name, call.args as Record<string, unknown>),
          },
        })),
      )
    }

    // Stream the final text back character by character for smooth UX
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        let idx = 0
        function push() {
          if (idx >= finalText.length) { controller.close(); return }
          const chunk = finalText.slice(idx, idx + 4)
          controller.enqueue(encoder.encode(chunk))
          idx += 4
          setTimeout(push, 10)
        }
        push()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return Response.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
