import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/middleware'
import { calculateStreakStatus, calculatePointsStats } from '@/lib/streak'

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

    // Get timezone offset from query params (in minutes)
    const url = new URL(request.url)
    const timezoneOffset = parseInt(url.searchParams.get('timezone') || '0')

    // Calculate streak status
    const streakData = await calculateStreakStatus(auth.userId, timezoneOffset)

    // Calculate points statistics
    const pointsStats = await calculatePointsStats(auth.userId, timezoneOffset)

    // Combine data
    const response = {
      ...streakData,
      average_daily_points: pointsStats.average_daily_points,
      multiplier_bonus: pointsStats.multiplier_bonus
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Streak API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streak data' },
      { status: 500 }
    )
  }
}
