import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentMonth } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentMonth()

    // Get leaderboard data
    const { data, error } = await supabaseAdmin
      .rpc('get_monthly_leaderboard', { target_month: month })

    if (error) {
      // Fallback to manual query if function doesn't exist
      const { data: leaderboardData, error: queryError } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          name,
          email,
          monthly_points!inner(points)
        `)
        .eq('monthly_points.month', month)
        .order('monthly_points(points)', { ascending: false })

      if (queryError) {
        console.error('Leaderboard error:', queryError)
        return NextResponse.json(
          { error: 'Failed to fetch leaderboard' },
          { status: 500 }
        )
      }

      // Transform data
      const leaderboard = leaderboardData.map((user: any, index: number) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.monthly_points[0]?.points || 0,
        rank: index + 1
      }))

      return NextResponse.json({ leaderboard, month })
    }

    return NextResponse.json({ leaderboard: data, month })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
