import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateAdmin } from '@/lib/middleware'
import { getCurrentMonth } from '@/lib/utils'

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

    // Update submission
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'verified',
        points_awarded: points,
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

    // Manually update user points (trigger should handle this, but as backup)
    await supabaseAdmin
      .from('users')
      .update({
        total_points: supabaseAdmin.rpc('increment', { x: points })
      })
      .eq('id', submission.user_id)

    // Update monthly points
    const month = getCurrentMonth()
    await supabaseAdmin
      .from('monthly_points')
      .upsert({
        user_id: submission.user_id,
        month,
        points: supabaseAdmin.rpc('increment', { x: points })
      })

    return NextResponse.json({
      message: 'Submission approved successfully',
      points_awarded: points
    })
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
