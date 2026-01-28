import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateAdmin } from '@/lib/middleware'
import { getCurrentMonth, calculatePointsWithMultiplier } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const auth = await authenticateAdmin(request)
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { submission_id, points, admin_notes } = await request.json()

    if (!submission_id || points === undefined) {
      return NextResponse.json(
        { error: 'Submission ID and points are required' },
        { status: 400 }
      )
    }

    // Get submission
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Apply streak multiplier to calculate final points
    const streakMultiplier = submission.streak_multiplier || 1.0
    const finalPoints = calculatePointsWithMultiplier(points, streakMultiplier)

    // Update submission
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'verified',
        points_awarded: finalPoints,
        admin_notes,
        verified_at: new Date().toISOString()
      })
      .eq('id', submission_id)

    if (updateError) {
      console.error('Approve error:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve submission' },
        { status: 500 }
      )
    }

    // Update user points
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('total_points')
      .eq('id', submission.user_id)
      .single()

    if (currentUser) {
      await supabaseAdmin
        .from('users')
        .update({
          total_points: currentUser.total_points + finalPoints
        })
        .eq('id', submission.user_id)
    }

    // Update monthly points
    const month = getCurrentMonth()
    const { data: currentMonthly } = await supabaseAdmin
      .from('monthly_points')
      .select('points')
      .eq('user_id', submission.user_id)
      .eq('month', month)
      .single()

    if (currentMonthly) {
      await supabaseAdmin
        .from('monthly_points')
        .update({
          points: currentMonthly.points + finalPoints
        })
        .eq('user_id', submission.user_id)
        .eq('month', month)
    } else {
      await supabaseAdmin
        .from('monthly_points')
        .insert({
          user_id: submission.user_id,
          month,
          points: finalPoints
        })
    }

    // Create notification for user
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: submission.user_id,
        type: 'submission_approved',
        title: 'Submission Approved!',
        message: `Your ${submission.action_type.replace('_', ' ')} submission was approved. You earned ${finalPoints} points!`,
        related_submission_id: submission_id,
        points_change: finalPoints,
        is_read: false
      })

    // Increment unread notification count
    const { data: currentUserData } = await supabaseAdmin
      .from('users')
      .select('unread_notifications_count')
      .eq('id', submission.user_id)
      .single()

    if (currentUserData) {
      await supabaseAdmin
        .from('users')
        .update({
          unread_notifications_count: (currentUserData.unread_notifications_count || 0) + 1
        })
        .eq('id', submission.user_id)
    }

    return NextResponse.json({
      message: 'Submission approved successfully',
      base_points: points,
      streak_multiplier: streakMultiplier,
      points_awarded: finalPoints
    })
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
