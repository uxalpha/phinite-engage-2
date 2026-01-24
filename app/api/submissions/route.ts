import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request)
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    // Get submissions for the user
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('user_id', auth.userId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Fetch submissions error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
