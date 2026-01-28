'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface LeaderboardEntry {
  id: string
  name: string
  email: string
  points: number
  rank: number
}

interface User {
  id: string
  name: string
  email: string
  total_points: number
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/auth')
      return
    }

    setUser(JSON.parse(userData))
    fetchLeaderboard()
  }, [router])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      const data = await response.json()
      
      if (response.ok) {
        setLeaderboard(data.leaderboard)
        setMonth(data.month)
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600'
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500'
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600'
    return 'bg-gray-200'
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-streak-gray">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-streak-gray p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black">Leaderboard 🏆</h1>
              {month && (
                <p className="text-muted-foreground mt-1">{getMonthName(month)}</p>
              )}
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
            variant="outline" 
            className="rounded-full font-semibold whitespace-nowrap"
            onClick={() => router.push('/dashboard')}
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
            variant="default" 
            className="bg-streak-purple hover:bg-streak-purple/90 rounded-full font-semibold whitespace-nowrap"
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

        {/* Main Content */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card-lg">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-4xl">👑</span>
            <div>
              <h2 className="text-2xl font-bold">Monthly Rankings</h2>
              <p className="text-sm text-muted-foreground">
                Top performers for {month && getMonthName(month)}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-muted-foreground">Loading leaderboard...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">No entries yet</h3>
              <p className="text-muted-foreground">Be the first to climb the leaderboard this month!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-5 rounded-2xl transition-all duration-200 ${
                    index < 3 
                      ? 'shadow-card hover:shadow-card-hover animate-card-hover' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  } ${
                    entry.id === user.id ? 'ring-2 ring-streak-purple' : ''
                  }`}
                  style={
                    index === 0
                      ? { background: 'linear-gradient(135deg, #FFD60A 0%, #FF9500 100%)' }
                      : index === 1
                      ? { background: 'linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%)' }
                      : index === 2
                      ? { background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)' }
                      : {}
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 flex items-center justify-center font-black rounded-full text-2xl ${
                        index < 3 ? 'text-white' : 'text-gray-700'
                      } ${getRankBg(entry.rank)}`}
                    >
                      {getRankDisplay(entry.rank)}
                    </div>
                    <div>
                      <div className={`font-bold text-lg ${index < 3 ? 'text-gray-900' : 'text-gray-800'}`}>
                        {entry.name}
                        {entry.id === user.id && (
                          <span className="ml-2 text-sm bg-streak-purple text-white px-3 py-1 rounded-full">You</span>
                        )}
                      </div>
                      <div className={`text-sm ${index < 3 ? 'text-gray-700' : 'text-muted-foreground'}`}>
                        {entry.email}
                      </div>
                    </div>
                  </div>
                  <div className={`text-right ${index < 3 ? 'text-gray-900' : 'text-gray-800'}`}>
                    <div className="text-3xl font-black">{entry.points}</div>
                    <div className={`text-xs ${index < 3 ? 'text-gray-700' : 'text-muted-foreground'}`}>points</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-card">
            <span className="text-xl">🔄</span>
            <span className="text-sm text-muted-foreground">
              Leaderboard resets on the 1st of each month
            </span>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            className="rounded-full"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
