import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { clientId, email, name } = await req.json()
  if (!clientId || !email || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  /* 1. Create auth user and send magic-link invite email */
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbit-reach-sigma.vercel.app'}/portal/home`,
    data: { full_name: name }
  })

  if (inviteError) {
    /* User may already exist — try looking them up */
    const { data: existingList } = await supabase.auth.admin.listUsers()
    const existing = existingList?.users?.find(u => u.email === email)
    if (!existing) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }
    /* Link existing user to client row */
    await supabase.from('clients').update({ user_id: existing.id }).eq('id', clientId)
    return NextResponse.json({ success: true, userId: existing.id, existing: true })
  }

  /* 2. Link new auth user to client row */
  const userId = inviteData.user.id
  await supabase.from('clients').update({ user_id: userId }).eq('id', clientId)

  return NextResponse.json({ success: true, userId, existing: false })
}
