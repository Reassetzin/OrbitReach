import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  /* ── auth: check secret header ── */
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* ── use service role to bypass RLS ── */
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('clients')
    .update({ revisions_used: 0 })
    .gte('monthly_revisions', 0) // all clients
    .select('id, name')

  if (error) {
    console.error('Reset revisions error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[reset-revisions] Reset ${count} clients at ${new Date().toISOString()}`)

  return NextResponse.json({
    success: true,
    reset: count,
    clients: data?.map(c => c.name),
    timestamp: new Date().toISOString(),
  })
}

/* also allow GET for Vercel cron (cron jobs use GET by default) */
export async function GET(req: NextRequest) {
  return POST(req)
}
