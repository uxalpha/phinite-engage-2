import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticate } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Mark all unread notifications as read
    const { error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', auth.user.id)
      .eq('is_read', false)

    if (updateError) {
      console.error('Mark all as read error:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    // Reset unread count
    await supabaseAdmin
      .from('users')
      .update({ unread_notifications_count: 0 })
      .eq('id', auth.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark all as read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
