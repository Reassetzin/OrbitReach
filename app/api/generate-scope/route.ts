import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a web design agency. Generate a scope of work for this project: "${prompt}"\n\nReturn ONLY a JSON array, no markdown, no explanation. Each item must have: title (string), description (string, 1-2 sentences), price (number in USD, realistic for a web agency).\n\nExample: [{"title":"Website Design","description":"Custom design for up to 5 pages.","price":1500}]\n\nGenerate 3-5 deliverables.`
      }]
    })
  })

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const scope = JSON.parse(cleaned)
    return NextResponse.json({ scope })
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 })
  }
}
