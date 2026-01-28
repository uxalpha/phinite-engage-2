import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticate } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Fetch notifications error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
