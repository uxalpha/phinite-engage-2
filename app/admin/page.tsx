'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  action_type: string
  image_url: string
  status: string
  points_awarded: number
  submitted_at: string
  notes?: string
  primary_action?: string
  action_confidence?: number
  users: {
    name: string
    email: string
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')

    if (!token || !user) {
      router.push('/auth')
      return
    }

    const userData = JSON.parse(user)
    if (userData.email !== 'ashish.deekonda@phinite.ai') {
      router.push('/dashboard')
      return
    }

    fetchPending(token)
  }, [router])

  const fetchPending = async (token: string) => {
    try {
      const response = await fetch('/api/admin/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setSubmissions(data.submissions)
      }
    } catch (err) {
      console.error('Failed to fetch pending:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submissionId: string, points: number) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setProcessing(submissionId)
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_id: submissionId,
          points,
          admin_notes: 'Manually approved by admin'
        })
      })

      if (response.ok) {
        await fetchPending(token)
      }
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (submissionId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setProcessing(submissionId)
    try {
      const response = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_id: submissionId,
          admin_notes: 'Manually rejected by admin'
        })
      })

      if (response.ok) {
        await fetchPending(token)
      }
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
          <button onClick={() => router.push('/dashboard')} className="btn">
            Back to Dashboard
          </button>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Pending Manual Review</h2>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No submissions pending review
            </div>
          ) : (
            <div className="space-y-6">
              {submissions.map((submission) => (
                <div key={submission.id} className="border border-gray-300 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image */}
                    <div>
                      <img
                        src={submission.image_url}
                        alt="Proof"
                        className="w-full border border-gray-300 cursor-pointer"
                        onClick={() => window.open(submission.image_url, '_blank')}
                      />
                      <p className="text-xs text-gray-600 mt-2">Click to view full size</p>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">User</div>
                        <div className="font-medium">{submission.users.name}</div>
                        <div className="text-sm text-gray-600">{submission.users.email}</div>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600">Claimed Action</div>
                        <div className="font-medium">{submission.action_type.replace('_', ' ')}</div>
                      </div>

                      {submission.primary_action && (
                        <div>
                          <div className="text-sm text-gray-600">AI Detected Action</div>
                          <div className="font-medium">{submission.primary_action}</div>
                        </div>
                      )}

                      {submission.action_confidence && (
                        <div>
                          <div className="text-sm text-gray-600">AI Confidence</div>
                          <div className="font-medium">
                            {(submission.action_confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-sm text-gray-600">Submitted</div>
                        <div className="font-medium">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </div>
                      </div>

                      {submission.notes && (
                        <div>
                          <div className="text-sm text-gray-600">User Notes</div>
                          <div className="text-sm">{submission.notes}</div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-4 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleApprove(submission.id, 5)}
                            className="btn text-sm"
                            disabled={processing === submission.id}
                          >
                            Like (5)
                          </button>
                          <button
                            onClick={() => handleApprove(submission.id, 10)}
                            className="btn text-sm"
                            disabled={processing === submission.id}
                          >
                            Comment (10)
                          </button>
                          <button
                            onClick={() => handleApprove(submission.id, 15)}
                            className="btn text-sm"
                            disabled={processing === submission.id}
                          >
                            Repost (15)
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleApprove(submission.id, 20)}
                            className="btn text-sm"
                            disabled={processing === submission.id}
                          >
                            Tag (20)
                          </button>
                          <button
                            onClick={() => handleApprove(submission.id, 25)}
                            className="btn text-sm"
                            disabled={processing === submission.id}
                          >
                            Original (25)
                          </button>
                          <button
                            onClick={() => handleReject(submission.id)}
                            className="btn text-sm border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                            disabled={processing === submission.id}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
