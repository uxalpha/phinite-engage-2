'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StreakData } from '@/lib/types'
import { Button } from '@/components/ui/button'

// Progress Ring Component
const ProgressRing = ({ progress, total, size = 120, strokeWidth = 12 }: { progress: number; total: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / total) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-streak-purple transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold">{progress}</div>
          <div className="text-xs text-muted-foreground">of {total}</div>
        </div>
      </div>
    </div>
  )
}

// Day Circle Component
const DayCircle = ({ status, day, isToday, submissionCount }: { status: string; day: string; isToday: boolean; submissionCount: number }) => {
  const getCircleStyles = () => {
    switch (status) {
      case 'verified':
        return 'bg-streak-green border-streak-green'
      case 'grace_used':
        return 'bg-streak-warning border-streak-warning'
      case 'missed':
        return 'bg-gray-300 border-gray-300'
      default:
        return isToday ? 'bg-white border-streak-purple border-4' : 'bg-gray-100 border-gray-300'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'verified':
        return (
          <svg className="w-6 h-6 text-white animate-check-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'grace_used':
        return <span className="text-white text-xl font-bold">!</span>
      case 'missed':
        return <span className="text-white text-xl">✗</span>
      default:
        return isToday ? (
          <ProgressRing progress={submissionCount} total={3} size={48} strokeWidth={4} />
        ) : (
          <span className="text-gray-400 text-xl">○</span>
        )
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in-up">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${getCircleStyles()} ${
          isToday && status !== 'verified' ? 'ring-4 ring-streak-purple ring-opacity-30' : ''
        }`}
      >
        {getIcon()}
      </div>
      <div className={`text-xs font-medium ${isToday ? 'text-streak-purple font-bold' : 'text-muted-foreground'}`}>
        {day}
      </div>
      {isToday && <div className="w-8 h-1 bg-streak-purple rounded-full"></div>}
    </div>
  )
}

interface User {
  id: string
  name: string
  email: string
  total_points: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/auth')
      return
    }

    const userObj = JSON.parse(userData)
    setUser(userObj)
    fetchUserData(token)
    fetchStreakData(token)
  }, [router])

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok && data.user) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    }
  }

  const fetchStreakData = async (token: string) => {
    try {
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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short' })
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

  const getTodayIndex = () => {
    if (!streakData) return -1
    const today = new Date().toISOString().split('T')[0]
    return streakData.calendar.findIndex(day => day.date === today)
  }

  if (loading || !user || !streakData) {
    return <div className="min-h-screen flex items-center justify-center bg-streak-gray">Loading...</div>
  }

  const nextMilestone = getNextMilestone()
  const todayIndex = getTodayIndex()

  return (
    <div className="min-h-screen bg-streak-gray p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black">Hey, {user.name.split(' ')[0]}! 👋</h1>
              <p className="text-muted-foreground mt-1">Keep the momentum going</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Points</div>
                <div className="text-2xl font-bold text-streak-purple">{user.total_points}</div>
              </div>
              <Button onClick={handleLogout} variant="outline" size="sm" className="rounded-full">
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button 
            variant="default" 
            className="bg-streak-purple hover:bg-streak-purple/90 rounded-full font-semibold whitespace-nowrap"
          >
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full font-semibold whitespace-nowrap"
            onClick={() => router.push('/recent')}
          >
            Recent Submissions
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full font-semibold whitespace-nowrap"
            onClick={() => router.push('/leaderboard')}
          >
            Leaderboard
          </Button>
          {user.email === 'ashish.deekonda@phinite.ai' && (
            <Button 
              variant="outline" 
              className="rounded-full font-semibold whitespace-nowrap"
              onClick={() => router.push('/admin')}
            >
              Admin
            </Button>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Hero Streak Card */}
          <div className="md:col-span-1 lg:col-span-1">
            <div 
              className="relative overflow-hidden rounded-2xl p-8 text-center shadow-card-lg animate-card-hover transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #FFD60A 0%, #FF9500 100%)'
              }}
            >
              <div className="text-7xl md:text-8xl font-black text-gray-900 mb-2">
                {streakData.current_streak}
              </div>
              <div className="text-xl font-semibold text-gray-800 mb-6">
                Streak Days
              </div>
              <div className="flex justify-center animate-fire-flicker">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-6xl">🔥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Goal Card */}
          <div className="md:col-span-1 lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-card-lg animate-card-hover transition-all duration-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-streak-purple rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h2 className="text-2xl font-bold">Daily Goal</h2>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="text-lg">📚</span> 1/2
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-lg">🏆</span> 2/3
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {streakData.calendar.map((day, index) => (
                  <DayCircle
                    key={day.date}
                    status={day.status}
                    day={formatDate(day.date)}
                    isToday={index === todayIndex}
                    submissionCount={day.submission_count}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* New Submission CTA Card - PROMINENT */}
          <div className="md:col-span-2 lg:col-span-3">
            <div 
              className="relative overflow-hidden rounded-2xl p-8 shadow-card-lg animate-card-hover transition-all duration-200 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #7a44ff 0%, #5e2ecc 100%)'
              }}
              onClick={() => router.push('/submit')}
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-white text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-black mb-2">Ready to Engage? 🚀</h2>
                  <p className="text-lg opacity-90">Submit your LinkedIn activity proof and earn points!</p>
                </div>
                <Button 
                  size="lg" 
                  className="bg-white text-streak-purple hover:bg-gray-100 rounded-full text-xl font-bold px-8 py-6 shadow-lg transform transition-transform hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/submit')
                  }}
                >
                  New Submission →
                </Button>
              </div>
            </div>
          </div>

          {/* Longest Streak Card */}
          <div className="md:col-span-1">
            <div className="bg-streak-cream rounded-2xl p-6 shadow-card animate-card-hover transition-all duration-200 relative overflow-hidden">
              <div className="text-6xl font-black text-gray-900 mb-2">
                {streakData.longest_streak}
              </div>
              <div className="text-lg font-semibold text-gray-700 mb-4">
                Streak Days
              </div>
              <div className="text-sm text-gray-600 mb-2">Personal Best</div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20">
                <span className="text-8xl">📚</span>
              </div>
            </div>
          </div>

          {/* Multiplier Card */}
          <div className="md:col-span-1">
            <div className="bg-streak-purple rounded-2xl p-6 shadow-card-lg animate-card-hover transition-all duration-200 text-white relative overflow-hidden">
              <div className="text-6xl font-black mb-2">
                {streakData.current_multiplier.toFixed(1)}×
              </div>
              <div className="text-lg font-semibold mb-4">
                Multiplier
              </div>
              <div className="text-sm opacity-90">
                {streakData.grace_day_available ? '🛡️ Grace available' : '⚠️ Grace used'}
              </div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 opacity-10">
                <span className="text-9xl">🔥</span>
              </div>
            </div>
          </div>

          {/* Next Milestone Card */}
          {nextMilestone && (
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-card animate-card-hover transition-all duration-200">
                <h3 className="text-lg font-bold mb-4 text-center">Next Milestone</h3>
                <div className="flex justify-center mb-4">
                  <ProgressRing 
                    progress={streakData.current_streak} 
                    total={nextMilestone.target}
                    size={120}
                    strokeWidth={12}
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    {nextMilestone.remaining} more {nextMilestone.remaining === 1 ? 'day' : 'days'}
                  </div>
                  <div className="text-lg font-bold text-streak-purple mt-1">
                    to {nextMilestone.multiplier} multiplier
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multiplier Impact Stats */}
          <div className="md:col-span-2 lg:col-span-3">
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <h3 className="text-xl font-bold mb-6">Multiplier Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{streakData.average_daily_points?.toFixed(1) || '0.0'}</div>
                    <div className="text-sm text-muted-foreground">Average Daily Points</div>
                    <div className="text-xs text-muted-foreground">Last 7 days</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-streak-green">+{streakData.multiplier_bonus?.toFixed(1) || '0.0'}</div>
                    <div className="text-sm text-muted-foreground">Bonus from Multiplier</div>
                    <div className="text-xs text-muted-foreground">Extra points earned</div>
                  </div>
                </div>
              </div>
              {streakData.current_multiplier > 1.0 && (
                <div className="mt-6 p-4 bg-streak-gray rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    💡 Your {streakData.current_multiplier.toFixed(1)}× multiplier is applied to all future actions. Keep your streak alive to maximize your earnings!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Streak Rules - Collapsible */}
          <div className="md:col-span-2 lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <button
                onClick={() => setShowRules(!showRules)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <h3 className="text-lg font-bold">Streak Rules & Milestones</h3>
                </div>
                <span className={`text-2xl transition-transform duration-200 ${showRules ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showRules && (
                <div className="px-6 pb-6 animate-fade-in-up">
                  <div className="border-t pt-6">
                    <h4 className="font-bold mb-3 text-streak-purple">How Streaks Work</h4>
                    <ul className="space-y-2 text-sm mb-6">
                      <li className="flex items-start gap-2">
                        <span className="text-streak-green font-bold">✓</span>
                        <span>1 verified action per day keeps your streak alive</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-streak-green font-bold">✓</span>
                        <span>Multiple actions per day earn additional points</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-streak-purple font-bold">📅</span>
                        <span>Evidence must be uploaded the same day to count</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-streak-warning font-bold">🛡️</span>
                        <span>Missing a day uses your grace day (1 per streak)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 font-bold">✗</span>
                        <span>Missing 2+ consecutive days resets your streak and multiplier</span>
                      </li>
                    </ul>

                    <h4 className="font-bold mb-3 text-streak-purple">Multiplier Milestones</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600 mb-1">1.5×</div>
                        <div className="text-sm text-gray-700">Reach a 5-day streak</div>
                      </div>
                      <div className="p-4 bg-streak-purple bg-opacity-10 rounded-xl">
                        <div className="text-2xl font-bold text-streak-purple mb-1">2.0×</div>
                        <div className="text-sm text-gray-700">Reach a 10-day streak (maximum)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
