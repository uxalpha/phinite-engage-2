import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateAdmin } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const auth = await authenticateAdmin(request)
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    // Get pending submissions
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq('status', 'manual_review')
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Fetch pending error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pending submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Admin pending error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
