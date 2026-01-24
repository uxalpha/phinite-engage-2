'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LeaderboardEntry {
  id: string
  name: string
  email: string
  points: number
  rank: number
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }

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

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
            {month && (
              <p className="text-gray-600 mt-1">{getMonthName(month)}</p>
            )}
          </div>
          <button onClick={() => router.push('/dashboard')} className="btn">
            Back to Dashboard
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No entries yet for this month
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-4 border border-gray-300 ${
                    index < 3 ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 flex items-center justify-center font-bold ${
                        index === 0
                          ? 'bg-black text-white'
                          : index === 1
                          ? 'bg-gray-800 text-white'
                          : index === 2
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-200'
                      }`}
                    >
                      {entry.rank}
                    </div>
                    <div>
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-sm text-gray-600">{entry.email}</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold">{entry.points}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-sm text-gray-600 text-center">
          <p>Leaderboard resets on the 1st of each month</p>
        </div>
      </div>
    </div>
  )
}
