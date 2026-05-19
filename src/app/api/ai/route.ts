import OpenAI from "openai"
import { NextResponse } from "next/server"

const MAX_PROMPT_CHARS = 2000

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI service is not configured" },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const rawPrompt =
    body !== null && typeof body === "object" && "prompt" in body
      ? (body as Record<string, unknown>).prompt
      : undefined

  if (typeof rawPrompt !== "string" || !rawPrompt.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
  }

  const prompt = rawPrompt.trim()

  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `Prompt must be ${MAX_PROMPT_CHARS} characters or fewer` },
      { status: 400 }
    )
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a school timetable expert. Help schools design efficient weekly schedules. Be specific, practical, and format your response clearly using plain text.",
        },
        { role: "user", content: prompt },
      ],
    })

    const result = completion.choices[0]?.message?.content

    if (!result) {
      return NextResponse.json(
        { error: "No response generated — please try again" },
        { status: 502 }
      )
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error("[AI route]", error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "AI service authentication failed" },
          { status: 502 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "AI rate limit reached — please try again shortly" },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    )
  }
}
