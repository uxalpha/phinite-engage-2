'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StreakData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function StreakPage() {
  const router = useRouter()
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/auth')
      return
    }

    const user = JSON.parse(userData)
    setUserName(user.name)

    fetchStreakData(token)
  }, [router])

  const fetchStreakData = async (token: string) => {
    try {
      // Get timezone offset in minutes
      const timezoneOffset = -new Date().getTimezoneOffset()
      
      const response = await fetch(`/api/streak?timezone=${timezoneOffset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStreakData(data)
      } else {
        console.error('Failed to fetch streak data:', data.error)
      }
    } catch (err) {
      console.error('Failed to fetch streak data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return '✓'
      case 'grace_used':
        return '⚠'
      case 'missed':
        return '✗'
      default:
        return '-'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500'
      case 'grace_used':
        return 'bg-yellow-500'
      case 'missed':
        return 'bg-red-500'
      default:
        return 'bg-gray-300'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
  }

  const getMultiplierBadgeColor = (multiplier: number) => {
    if (multiplier >= 2.0) return 'bg-purple-600 text-white'
    if (multiplier >= 1.5) return 'bg-blue-600 text-white'
    return 'bg-gray-400 text-white'
  }

  const getNextMilestone = () => {
    if (!streakData) return null
    
    if (streakData.current_streak < 5) {
      return {
        target: 5,
        remaining: 5 - streakData.current_streak,
        multiplier: '1.5×'
      }
    } else if (streakData.current_streak < 10) {
      return {
        target: 10,
        remaining: 10 - streakData.current_streak,
        multiplier: '2×'
      }
    }
    return null
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!streakData) {
    return <div className="min-h-screen flex items-center justify-center">Failed to load streak data</div>
  }

  const nextMilestone = getNextMilestone()

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Streak Tracker</h1>
            <p className="text-muted-foreground mt-1">Keep the momentum going, {userName}</p>
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {/* Main Streak Stats */}
        <Card className="mb-8">
          <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Streak */}
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">
                {streakData.current_streak}
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">Current Streak</div>
              <div className="text-xs text-muted-foreground mt-1">
                {streakData.current_streak === 1 ? 'day' : 'days'}
              </div>
            </div>

            {/* Current Multiplier */}
            <div className="text-center">
              <Badge className={`px-6 py-3 text-4xl font-bold mb-2 ${getMultiplierBadgeColor(streakData.current_multiplier)}`}>
                {streakData.current_multiplier.toFixed(1)}×
              </Badge>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">Multiplier</div>
              <div className="text-xs text-muted-foreground mt-1">
                {streakData.grace_day_available ? 'Grace available' : 'Grace used'}
              </div>
            </div>

            {/* Longest Streak */}
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">
                {streakData.longest_streak}
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">Best Streak</div>
              <div className="text-xs text-muted-foreground mt-1">personal record</div>
            </div>
          </div>

          {/* Next Milestone */}
          {nextMilestone && (
            <>
              <Separator className="my-6" />
              <div className="text-center">
                <div className="text-sm text-muted-foreground">
                  {nextMilestone.remaining} more {nextMilestone.remaining === 1 ? 'day' : 'days'} to unlock <span className="font-bold">{nextMilestone.multiplier}</span> multiplier
                </div>
                <div className="mt-2 bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-2 transition-all duration-300"
                    style={{ width: `${(streakData.current_streak / nextMilestone.target) * 100}%` }}
                  />
                </div>
              </div>
            </>
          )}
          </CardContent>
        </Card>

        {/* 7-Day Calendar */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Last 7 Days</CardTitle>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setShowRules(!showRules)}
              >
                ℹ Rules
              </Button>
            </div>
          </CardHeader>
          <CardContent>

          {/* Calendar Strip */}
          <div className="grid grid-cols-7 gap-2">
            {streakData.calendar.map((day) => (
              <div 
                key={day.date} 
                className={`border-2 rounded-lg ${
                  day.status === 'verified' ? 'border-green-500 bg-green-50' :
                  day.status === 'grace_used' ? 'border-yellow-500 bg-yellow-50' :
                  'border-border bg-muted'
                } p-3 text-center`}
              >
                <div className="text-xs text-muted-foreground mb-2">
                  {formatDate(day.date)}
                </div>
                <div className={`w-10 h-10 mx-auto rounded-full ${getStatusColor(day.status)} flex items-center justify-center text-white font-bold text-xl`}>
                  {getStatusIcon(day.status)}
                </div>
                {day.submission_count > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {day.submission_count} {day.submission_count === 1 ? 'action' : 'actions'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Grace Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Missed</span>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Streak Rules */}
        {showRules && (
          <Card className="mb-8 bg-muted/50">
            <CardHeader>
              <CardTitle>Streak Rules</CardTitle>
            </CardHeader>
            <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>1 verified action per day keeps your streak alive</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Multiple actions per day earn additional points</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Evidence must be uploaded the same day to count</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Missing a day uses your grace day (1 per streak)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Missing 2+ consecutive days resets your streak and multiplier</span>
              </li>
            </ul>

            <Separator className="my-4" />
            <div>
              <h4 className="font-bold mb-2">Multiplier Milestones</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>5-day streak → 1.5× multiplier</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>10-day streak → 2× multiplier (maximum)</span>
                </li>
              </ul>
            </div>
            </CardContent>
          </Card>
        )}

        {/* Multiplier Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Multiplier Impact</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-3xl font-bold">{streakData.average_daily_points?.toFixed(1) || '0.0'}</div>
              <div className="text-sm text-muted-foreground">Average Daily Points</div>
              <div className="text-xs text-muted-foreground mt-1">Last 7 days</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">+{streakData.multiplier_bonus?.toFixed(1) || '0.0'}</div>
              <div className="text-sm text-muted-foreground">Bonus from Multiplier</div>
              <div className="text-xs text-muted-foreground mt-1">Extra points earned</div>
            </div>
          </div>

          {streakData.current_multiplier > 1.0 && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Your {streakData.current_multiplier.toFixed(1)}× multiplier is applied to all future actions based on when you submit them. Keep your streak alive to maximize your earnings!
              </p>
            </>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
