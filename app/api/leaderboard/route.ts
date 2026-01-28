import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentMonth } from '@/lib/utils'
import { authenticateUser } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentMonth()

    // Authenticate user to get their ID
    const auth = await authenticateUser(request)
    const userId = 'error' in auth ? null : auth.userId

    // Query the current_month_leaderboard view for top 10
    const { data: top10Data, error: top10Error } = await supabaseAdmin
      .from('current_month_leaderboard')
      .select('*')
      .limit(10)

    if (top10Error) {
      console.error('Top 10 leaderboard error:', top10Error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    const leaderboard = top10Data || []

    // Check if current user is in top 10
    let currentUserEntry = null
    if (userId) {
      const userInTop10 = leaderboard.find((entry: any) => entry.id === userId)
      
      if (!userInTop10) {
        // User is not in top 10, fetch their position
        const { data: userData, error: userError } = await supabaseAdmin
          .from('current_month_leaderboard')
          .select('*')
          .eq('id', userId)
          .single()

        if (!userError && userData) {
          currentUserEntry = userData
        }
      }
    }

    return NextResponse.json({ 
      leaderboard, 
      month,
      currentUser: currentUserEntry 
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
