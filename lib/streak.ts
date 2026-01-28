import { supabaseAdmin } from './supabase'

export interface DayStatus {
  date: string
  status: 'verified' | 'missed' | 'grace_used'
  submission_count: number
}

export interface StreakData {
  current_streak: number
  longest_streak: number
  current_multiplier: number
  grace_day_available: boolean
  grace_used_date: string | null
  last_activity_date: string | null
  calendar: DayStatus[]
}

/**
 * Get streak multiplier based on streak days
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 10) return 2.0
  if (streakDays >= 5) return 1.5
  return 1.0
}

/**
 * Calculate points with multiplier
 */
export function calculatePointsWithMultiplier(basePoints: number, multiplier: number): number {
  return Math.round(basePoints * multiplier)
}

/**
 * Convert UTC date to local date string (YYYY-MM-DD)
 */
function toLocalDateString(utcDate: Date, timezoneOffset: number): string {
  const localDate = new Date(utcDate.getTime() + timezoneOffset * 60 * 1000)
  return localDate.toISOString().split('T')[0]
}

/**
 * Get array of last N days in local timezone
 */
function getLastNDays(n: number, timezoneOffset: number): string[] {
  const days: string[] = []
  const now = new Date()
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    days.push(toLocalDateString(date, timezoneOffset))
  }
  
  return days
}

/**
 * Calculate streak status for a user
 * @param userId - User ID
 * @param timezoneOffset - Timezone offset in minutes (e.g., -480 for PST)
 */
export async function calculateStreakStatus(
  userId: string,
  timezoneOffset: number = 0
): Promise<StreakData> {
  // Fetch all verified submissions for the user
  const { data: submissions, error } = await supabaseAdmin
    .from('submissions')
    .select('submitted_at, points_awarded, status')
    .eq('user_id', userId)
    .eq('status', 'verified')
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching submissions for streak:', error)
    throw error
  }

  // Fetch current user data for streak tracking
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('current_streak, longest_streak, grace_day_used, grace_day_date, last_activity_date')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('Error fetching user data:', userError)
    throw userError
  }

  // Group submissions by local date
  const submissionsByDate = new Map<string, number>()
  
  if (submissions && submissions.length > 0) {
    for (const sub of submissions) {
      const localDate = toLocalDateString(new Date(sub.submitted_at), timezoneOffset)
      submissionsByDate.set(localDate, (submissionsByDate.get(localDate) || 0) + 1)
    }
  }

  // Get today's date in local timezone
  const today = toLocalDateString(new Date(), timezoneOffset)

  // Calculate current streak
  let currentStreak = 0
  let graceUsed = false
  let graceUsedDate: string | null = null
  let lastActivityDate: string | null = null
  let checkDate = new Date()

  // Start from today and work backwards
  for (let i = 0; i < 365; i++) { // Max check 365 days
    const dateStr = toLocalDateString(checkDate, timezoneOffset)
    const hasActivity = submissionsByDate.has(dateStr)

    if (hasActivity) {
      currentStreak++
      if (!lastActivityDate) {
        lastActivityDate = dateStr
      }
    } else {
      // No activity on this day
      if (i === 0) {
        // Today has no activity - check if we should use grace
        if (!graceUsed && currentStreak > 0) {
          // Use grace day for today
          graceUsed = true
          graceUsedDate = dateStr
          // Don't increment streak, but don't break either
        } else {
          // No grace available or no streak to maintain
          break
        }
      } else {
        // Past day with no activity
        if (!graceUsed && currentStreak > 0) {
          // Use grace day
          graceUsed = true
          graceUsedDate = dateStr
        } else {
          // Already used grace or first miss - streak ends
          break
        }
      }
    }

    // Move to previous day
    checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000)
  }

  // Update longest streak if current is higher
  const longestStreak = Math.max(userData?.longest_streak || 0, currentStreak)

  // Generate 7-day calendar
  const last7Days = getLastNDays(7, timezoneOffset)
  const calendar: DayStatus[] = last7Days.map(date => {
    const count = submissionsByDate.get(date) || 0
    let status: 'verified' | 'missed' | 'grace_used' = 'missed'
    
    if (count > 0) {
      status = 'verified'
    } else if (graceUsedDate === date) {
      status = 'grace_used'
    }

    return {
      date,
      status,
      submission_count: count
    }
  })

  // Calculate current multiplier
  const currentMultiplier = getStreakMultiplier(currentStreak)

  // Grace day is available if not used
  const graceAvailable = !graceUsed

  // Update user's streak data in database
  await supabaseAdmin
    .from('users')
    .update({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: lastActivityDate,
      grace_day_used: graceUsed,
      grace_day_date: graceUsedDate
    })
    .eq('id', userId)

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    current_multiplier: currentMultiplier,
    grace_day_available: graceAvailable,
    grace_used_date: graceUsedDate,
    last_activity_date: lastActivityDate,
    calendar
  }
}

/**
 * Calculate average daily points and multiplier bonus
 */
export async function calculatePointsStats(
  userId: string,
  timezoneOffset: number = 0
): Promise<{ average_daily_points: number; multiplier_bonus: number }> {
  // Get last 7 days of verified submissions
  const last7Days = getLastNDays(7, timezoneOffset)
  const startDate = last7Days[0]
  
  const { data: submissions, error } = await supabaseAdmin
    .from('submissions')
    .select('submitted_at, points_awarded, streak_multiplier')
    .eq('user_id', userId)
    .eq('status', 'verified')
    .gte('submitted_at', new Date(startDate + 'T00:00:00Z').toISOString())

  if (error || !submissions) {
    return { average_daily_points: 0, multiplier_bonus: 0 }
  }

  // Calculate total points and base points
  let totalPoints = 0
  let totalBasePoints = 0

  for (const sub of submissions) {
    const pointsAwarded = sub.points_awarded || 0
    const multiplier = sub.streak_multiplier || 1.0
    
    totalPoints += pointsAwarded
    // Reverse calculate base points
    totalBasePoints += pointsAwarded / multiplier
  }

  const daysWithActivity = last7Days.filter(date => {
    return submissions.some(sub => {
      const subDate = toLocalDateString(new Date(sub.submitted_at), timezoneOffset)
      return subDate === date
    })
  }).length

  const averageDailyPoints = daysWithActivity > 0 ? totalPoints / daysWithActivity : 0
  const multiplierBonus = totalPoints - totalBasePoints

  return {
    average_daily_points: Math.round(averageDailyPoints * 100) / 100,
    multiplier_bonus: Math.round(multiplierBonus * 100) / 100
  }
}
