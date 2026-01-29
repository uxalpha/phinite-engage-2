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

    // Get ALL submissions for debugging
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select(`
        id,
        user_id,
        status,
        action_type,
        workflow_id,
        submitted_at,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch all submissions error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    // Group by status
    const byStatus: Record<string, any[]> = {}
    submissions?.forEach(sub => {
      if (!byStatus[sub.status]) {
        byStatus[sub.status] = []
      }
      const userData = Array.isArray(sub.users) ? sub.users[0] : sub.users
      byStatus[sub.status].push({
        user: userData?.email,
        action: sub.action_type,
        submitted: sub.submitted_at,
        workflow_id: sub.workflow_id
      })
    })

    return NextResponse.json({ 
      total: submissions?.length || 0,
      byStatus,
      recentSubmissions: submissions?.slice(0, 10).map(s => {
        const userData = Array.isArray(s.users) ? s.users[0] : s.users
        return {
          id: s.id,
          user: userData?.email,
          status: s.status,
          action: s.action_type,
          submitted: s.submitted_at,
          workflow_id: s.workflow_id
        }
      })
    })
  } catch (error) {
    console.error('Admin all submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
