import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateAdmin } from '@/lib/middleware'

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

    const { submission_id, admin_notes } = await request.json()

    if (!submission_id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Update submission
    const { error } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'rejected',
        admin_notes
      })
      .eq('id', submission_id)

    if (error) {
      console.error('Reject error:', error)
      return NextResponse.json(
        { error: 'Failed to reject submission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Submission rejected successfully'
    })
  } catch (error) {
    console.error('Reject error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
