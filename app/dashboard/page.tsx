'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  total_points: number
}

interface Submission {
  id: string
  action_type: string
  image_url: string
  status: string
  points_awarded: number
  submitted_at: string
  notes?: string
}

type Platform = 'linkedin' | 'twitter' | 'instagram' | 'reddit'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [activePlatform, setActivePlatform] = useState<Platform>('linkedin')

  const [formData, setFormData] = useState({
    action_type: 'LIKE',
    file: null as File | null,
    notes: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/auth')
      return
    }

    setUser(JSON.parse(userData))
    fetchSubmissions(token)
  }, [router])


  const fetchSubmissions = async (token: string) => {
    try {
      const response = await fetch('/api/submissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setSubmissions(data.submissions)
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }

    if (!formData.file) {
      setError('Please select an image')
      setSubmitting(false)
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('action_type', formData.action_type)
      formDataToSend.append('file', formData.file)
      if (formData.notes) {
        formDataToSend.append('notes', formData.notes)
      }

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed')
      }

      // Show success message and reset form immediately
      setMessage('✅ Submission received successfully! AI is analyzing your proof in the background. Check the admin review queue in a few minutes.')
      setFormData({ action_type: 'LIKE', file: null, notes: '' })
      
      // Reset file input
      const fileInput = document.getElementById('file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Refresh submissions to show the new pending entry
      fetchSubmissions(token)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Brand Engagement</h1>
            <p className="text-gray-600 mt-1">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Total Points</div>
              <div className="text-2xl font-bold">{user.total_points}</div>
            </div>
            <button onClick={handleLogout} className="btn text-sm">
              Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-300 pb-4">
          <button className="font-medium border-b-2 border-black pb-2">Submit Proof</button>
          <button onClick={() => router.push('/leaderboard')} className="text-gray-600 hover:text-black pb-2">
            Leaderboard
          </button>
          {user.email === 'ashish.deekonda@phinite.ai' && (
            <button onClick={() => router.push('/admin')} className="text-gray-600 hover:text-black pb-2">
              Admin
            </button>
          )}
        </div>

        {/* Platform Tabs */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Select Platform</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActivePlatform('linkedin')}
              className={`px-4 py-2 border-2 transition-colors ${
                activePlatform === 'linkedin'
                  ? 'border-black bg-black text-white font-medium'
                  : 'border-gray-300 bg-white text-black hover:border-gray-400'
              }`}
            >
              LinkedIn
            </button>
            <button
              disabled
              className="px-4 py-2 border-2 border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              Twitter (Coming Soon)
            </button>
            <button
              disabled
              className="px-4 py-2 border-2 border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              Instagram (Coming Soon)
            </button>
            <button
              disabled
              className="px-4 py-2 border-2 border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              Reddit (Coming Soon)
            </button>
          </div>
        </div>

        {/* Platform Content */}
        {activePlatform === 'linkedin' ? (
          <>
            {/* Submit Form */}
            <div className="card mb-8">
              <h2 className="text-xl font-bold mb-4">Submit LinkedIn Activity</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Activity Type *</label>
                  <select
                    className="input"
                    value={formData.action_type}
                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                  >
                    <option value="LIKE">Like (5 points)</option>
                    <option value="COMMENT">Comment (10 points)</option>
                    <option value="REPOST">Repost (15 points)</option>
                    <option value="TAG">Tag a Teammate (20 points)</option>
                    <option value="ORIGINAL_POST">Original Post (25 points)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Proof Screenshot *</label>
                  <input
                    id="file"
                    type="file"
                    accept="image/*"
                    className="input"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Upload a screenshot of your LinkedIn activity
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional context..."
                  />
                </div>

                {message && (
                  <div className="p-3 border border-black bg-white">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="p-3 border border-gray-400 bg-gray-100">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Proof'}
                </button>
              </form>
            </div>

            {/* Recent Submissions */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Your Submissions</h2>
              {submissions.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No submissions yet</p>
              ) : (
                <div className="space-y-4">
                  {submissions.slice(0, 5).map((submission) => (
                    <div key={submission.id} className="border border-gray-300 p-4 flex flex-col md:flex-row gap-4">
                      <img
                        src={submission.image_url}
                        alt="Proof"
                        className="w-full md:w-24 h-24 object-cover border border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{submission.action_type.replace('_', ' ')}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(submission.submitted_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className={`badge badge-${submission.status}`}>
                            {submission.status === 'manual_review' ? 'PENDING ADMIN REVIEW' : submission.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {submission.status === 'verified' && (
                          <div className="text-sm font-medium">+{submission.points_awarded} points</div>
                        )}
                        {submission.notes && (
                          <div className="text-sm text-gray-600 mt-2">{submission.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
            <p className="text-gray-600">
              {activePlatform === 'twitter' && 'Twitter integration is coming soon!'}
              {activePlatform === 'instagram' && 'Instagram integration is coming soon!'}
              {activePlatform === 'reddit' && 'Reddit integration is coming soon!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
