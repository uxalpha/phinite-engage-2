import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateUser } from '@/lib/middleware'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateUser(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id: notificationId } = await params

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .eq('user_id', auth.userId)
      .single()

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Mark as read
    const { error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (updateError) {
      console.error('Update notification error:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      )
    }

    // Decrement unread count if it was previously unread
    if (!notification.is_read) {
      // Get current unread count first
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('unread_notifications_count')
        .eq('id', auth.userId)
        .single()
      
      await supabaseAdmin
        .from('users')
        .update({
          unread_notifications_count: Math.max(0, (userData?.unread_notifications_count || 1) - 1)
        })
        .eq('id', auth.userId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
