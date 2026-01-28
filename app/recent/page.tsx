'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UserMenu from '@/components/UserMenu'
import NotificationBell from '@/components/NotificationBell'
import ErrorBoundary from '@/components/ErrorBoundary'
import { generateBlurDataURL } from '@/lib/imageUtils'

interface User {
  id: string
  name: string
  email: string
  total_points: number
  unread_notifications_count?: number
  profile_image_url?: string
}

interface Submission {
  id: string
  action_type: string
  image_url: string
  status: string
  points_awarded: number
  submitted_at: string
  notes?: string
  streak_multiplier?: number
}

export default function RecentSubmissionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all')

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/auth')
      return
    }

    const userObj = JSON.parse(userData)
    if (isMounted) {
      setUser(userObj)
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortController.signal
        })
        const data = await response.json()
        if (response.ok && data.user && isMounted) {
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch user data:', err)
        }
      }
    }

    const fetchSubmissions = async () => {
      try {
        const response = await fetch('/api/submissions', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortController.signal
        })
        const data = await response.json()
        if (response.ok && isMounted) {
          setSubmissions(data.submissions)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch submissions:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchUserData()
    fetchSubmissions()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-streak-green hover:bg-streak-green text-white">✓ Verified</Badge>
      case 'manual_review':
        return <Badge className="bg-streak-warning hover:bg-streak-warning text-white">⏳ Pending Review</Badge>
      case 'rejected':
        return <Badge variant="destructive">✗ Rejected</Badge>
      case 'ai_analyzing':
        return <Badge className="bg-blue-500 hover:bg-blue-500 text-white">🤖 AI Analyzing</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'LIKE': return '👍'
      case 'COMMENT': return '💬'
      case 'REPOST': return '🔄'
      case 'TAG': return '🏷️'
      case 'ORIGINAL_POST': return '✍️'
      default: return '📝'
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'all') return true
    if (filter === 'pending') return sub.status === 'manual_review' || sub.status === 'ai_analyzing'
    return sub.status === filter
  })

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-streak-gray">Loading...</div>
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-streak-gray p-4 md:p-8 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black">Recent Submissions 📋</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Track your LinkedIn activity submissions</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <NotificationBell unreadCount={user.unread_notifications_count || 0} />
              <UserMenu user={user} />
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
            variant="default" 
            className="bg-streak-purple hover:bg-streak-purple/90 rounded-full font-semibold whitespace-nowrap"
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

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-card mb-6 inline-flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => setFilter('all')}
            className={`rounded-xl ${filter === 'all' ? 'bg-streak-purple hover:bg-streak-purple/90' : ''}`}
          >
            All ({submissions.length})
          </Button>
          <Button
            variant={filter === 'verified' ? 'default' : 'ghost'}
            onClick={() => setFilter('verified')}
            className={`rounded-xl ${filter === 'verified' ? 'bg-streak-green hover:bg-streak-green/90' : ''}`}
          >
            Verified ({submissions.filter(s => s.status === 'verified').length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'ghost'}
            onClick={() => setFilter('pending')}
            className={`rounded-xl ${filter === 'pending' ? 'bg-streak-warning hover:bg-streak-warning/90' : ''}`}
          >
            Pending ({submissions.filter(s => s.status === 'manual_review' || s.status === 'ai_analyzing').length})
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'ghost'}
            onClick={() => setFilter('rejected')}
            className={`rounded-xl ${filter === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}`}
          >
            Rejected ({submissions.filter(s => s.status === 'rejected').length})
          </Button>
        </div>

        {/* Submissions Grid */}
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-card">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold mb-2">No submissions yet</h2>
            <p className="text-muted-foreground mb-6">Start engaging on LinkedIn and submit your proof!</p>
            <Button 
              className="bg-streak-purple hover:bg-streak-purple/90 rounded-full font-bold"
              onClick={() => router.push('/submit')}
            >
              Make Your First Submission
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredSubmissions.map((submission) => (
              <div 
                key={submission.id} 
                className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 animate-card-hover"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  <Image
                    src={submission.image_url}
                    alt="Submission proof"
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                    placeholder="blur"
                    blurDataURL={generateBlurDataURL()}
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(submission.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getActionIcon(submission.action_type)}</span>
                      <span className="font-bold text-lg">
                        {submission.action_type.replace('_', ' ')}
                      </span>
                    </div>
                    {submission.status === 'verified' && (
                      <div className="text-right">
                        <div className="text-2xl font-black text-streak-green">
                          +{submission.points_awarded}
                        </div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    )}
                  </div>

                  {submission.streak_multiplier && submission.streak_multiplier > 1 && (
                    <div className="mb-3 p-2 bg-streak-purple bg-opacity-10 rounded-lg">
                      <span className="text-sm font-semibold text-streak-purple">
                        🔥 {submission.streak_multiplier.toFixed(1)}× Streak Multiplier
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mb-3">
                    {new Date(submission.submitted_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>

                  {submission.notes && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                      {submission.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {submissions.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-card text-center">
              <div className="text-3xl font-black text-streak-purple mb-2">{submissions.length}</div>
              <div className="text-sm text-muted-foreground">Total Submissions</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-card text-center">
              <div className="text-3xl font-black text-streak-green mb-2">
                {submissions.filter(s => s.status === 'verified').length}
              </div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-card text-center">
              <div className="text-3xl font-black text-streak-warning mb-2">
                {submissions.filter(s => s.status === 'manual_review' || s.status === 'ai_analyzing').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-card text-center">
              <div className="text-3xl font-black text-streak-purple mb-2">
                {submissions.filter(s => s.status === 'verified').reduce((sum, s) => sum + s.points_awarded, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Points Earned</div>
            </div>
          </div>
        )}

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

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-6xl mx-auto">
          <Button 
            size="lg"
            className="w-full bg-streak-purple hover:bg-streak-purple/90 rounded-xl text-lg font-bold h-14"
            onClick={() => router.push('/submit')}
          >
             New Submission
          </Button>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
