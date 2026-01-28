'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import ErrorBoundary from '@/components/ErrorBoundary'
import { generateBlurDataURL } from '@/lib/imageUtils'

interface Submission {
  id: string
  action_type: string
  image_url: string
  status: string
  points_awarded: number
  submitted_at: string
  notes?: string
  admin_notes?: string
  
  // AI Verification Fields
  workflow_id?: string
  platform_detected?: string
  like_detected?: boolean
  comment_detected?: boolean
  repost_detected?: boolean
  tag_detected?: boolean
  original_post_detected?: boolean
  primary_action?: string
  assigned_points?: number
  action_confidence?: number
  duplicate_risk?: string
  
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
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [checkingPending, setCheckingPending] = useState(false)
  const [checkResult, setCheckResult] = useState<any>(null)

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

    setCurrentUserEmail(userData.email)
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
        console.log('Fetched submissions:', data.submissions.length)
      }
    } catch (err) {
      console.error('Failed to fetch pending:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDebugInfo = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch('/api/admin/all-submissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setDebugInfo(data)
        setShowDebug(true)
      }
    } catch (err) {
      console.error('Failed to fetch debug info:', err)
    }
  }

  const checkPendingSubmissions = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setCheckingPending(true)
    setCheckResult(null)

    try {
      const response = await fetch('/api/admin/check-pending', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setCheckResult(data)
        // Refresh the pending list
        await fetchPending(token)
        // Refresh debug info if showing
        if (showDebug) {
          await fetchDebugInfo()
        }
      } else {
        setCheckResult({ error: data.error || 'Failed to check pending submissions' })
      }
    } catch (err: any) {
      console.error('Failed to check pending:', err)
      setCheckResult({ error: err.message || 'Failed to check pending submissions' })
    } finally {
      setCheckingPending(false)
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
    <ErrorBoundary>
      <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={checkPendingSubmissions} 
              size="sm"
              disabled={checkingPending}
            >
              {checkingPending ? '⏳ Checking...' : '🔄 Check Pending Status'}
            </Button>
            <Button onClick={fetchDebugInfo} size="sm" variant="outline">
              🔍 Debug Info
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Check Result Message */}
        {checkResult && (
          <Alert variant={checkResult.error ? "destructive" : "default"} className="mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <AlertTitle>
                  {checkResult.error ? '❌ Error' : '✅ Status Check Complete'}
                </AlertTitle>
                <AlertDescription>
                  {checkResult.error ? (
                    <p>{checkResult.error}</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <p className="font-medium">{checkResult.message}</p>
                      <div className="text-sm">
                        <div>Checked: {checkResult.checked} submissions</div>
                        <div>Updated: {checkResult.updated} submissions</div>
                      </div>
                      {checkResult.results && checkResult.results.length > 0 && (
                        <Collapsible className="mt-3">
                          <CollapsibleTrigger className="font-medium text-sm hover:underline">
                            View Details
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-1 text-xs">
                            {checkResult.results.map((result: any, idx: number) => (
                              <div key={idx} className="bg-background p-2 border rounded">
                                <div><strong>ID:</strong> {result.id}</div>
                                <div><strong>Status:</strong> {result.status}</div>
                                <div><strong>Message:</strong> {result.message}</div>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCheckResult(null)}
                className="ml-2"
              >
                &times;
              </Button>
            </div>
          </Alert>
        )}

        {/* Debug Info Modal */}
        {showDebug && debugInfo && (
          <Alert className="mb-6 bg-yellow-50 border-yellow-400">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <AlertTitle>Debug Information</AlertTitle>
                <AlertDescription>
                  <div className="space-y-3 text-sm mt-2">
                    <div>
                      <strong>Total Submissions:</strong> {debugInfo.total}
                    </div>
                    <div>
                      <strong>By Status:</strong>
                      <pre className="mt-1 bg-background p-2 border rounded overflow-auto max-h-40 text-xs">
                        {JSON.stringify(debugInfo.byStatus, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <strong>Recent 10 Submissions:</strong>
                      <div className="mt-1 bg-background p-2 border rounded overflow-auto max-h-60">
                        {debugInfo.recentSubmissions?.map((sub: any, idx: number) => (
                          <div key={idx} className="border-b py-2 last:border-b-0">
                            <div><strong>User:</strong> {sub.user}</div>
                            <div><strong>Status:</strong> {sub.status}</div>
                            <div><strong>Action:</strong> {sub.action}</div>
                            <div><strong>Workflow ID:</strong> {sub.workflow_id || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{new Date(sub.submitted).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDebug(false)}
                className="ml-2"
              >
                &times;
              </Button>
            </div>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pending Manual Review - All Users</CardTitle>
            <CardDescription>
              Showing all submissions awaiting review (including your own submissions)
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              💡 If you don't see recent submissions here, click <strong>🔄 Check Pending Status</strong> above to update submissions that are stuck in "pending" status.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions pending review
              </div>
            ) : (
            <div className="space-y-6">
              {submissions.map((submission) => {
                const isOwnSubmission = submission.users.email === currentUserEmail
                return (
                <Card key={submission.id} className={isOwnSubmission ? 'border-blue-400 bg-blue-50' : ''}>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Image */}
                      <div>
                        <div
                          className="relative w-full h-auto border rounded cursor-pointer hover:opacity-90 transition overflow-hidden"
                          onClick={() => window.open(submission.image_url, '_blank')}
                        >
                          <Image
                            src={submission.image_url}
                            alt="Proof"
                            width={800}
                            height={600}
                            className="w-full h-auto"
                            placeholder="blur"
                            blurDataURL={generateBlurDataURL()}
                            loading="lazy"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Click to view full size</p>
                      </div>

                      {/* Basic Details */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground">User</div>
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            {submission.users.name}
                            {isOwnSubmission && (
                              <Badge className="bg-blue-600">YOUR SUBMISSION</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{submission.users.email}</div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">User Claimed Action</div>
                          <div className="font-medium text-lg">{submission.action_type.replace('_', ' ')}</div>
                        </div>

                        <div>
                          <div className="text-sm text-muted-foreground">Submitted</div>
                          <div className="font-medium">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </div>
                        </div>

                        {submission.notes && (
                          <div>
                            <div className="text-sm text-muted-foreground">User Notes</div>
                            <div className="text-sm bg-muted p-2 border rounded">
                              {submission.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Insights Section */}
                    <Separator className="my-4" />
                    <Collapsible
                      open={expandedSubmission === submission.id}
                      onOpenChange={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0 h-auto font-semibold text-lg mb-4 hover:bg-transparent">
                          <span>🤖 AI Analysis & Insights</span>
                          <span className="text-2xl">{expandedSubmission === submission.id ? '−' : '+'}</span>
                        </Button>
                      </CollapsibleTrigger>

                      {/* Quick AI Summary (Always Visible) */}
                      <div className="bg-blue-50 p-3 border border-blue-200 rounded mb-3">
                        <div className="text-xs text-muted-foreground">AI Detected Action</div>
                        <div className="font-bold text-lg">{submission.primary_action || 'N/A'}</div>
                      </div>

                      {/* Second Row - Other Three Panels */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div className="bg-green-50 p-3 border border-green-200 rounded">
                          <div className="text-xs text-muted-foreground">Confidence</div>
                          <div className="font-bold text-sm">
                            {submission.action_confidence ? `${(submission.action_confidence * 100).toFixed(0)}%` : 'N/A'}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 border border-purple-200 rounded">
                          <div className="text-xs text-muted-foreground">Suggested Points</div>
                          <div className="font-bold text-sm">{submission.assigned_points || 0}</div>
                        </div>
                        <div className={`p-3 border rounded ${
                          submission.duplicate_risk === 'HIGH' ? 'bg-red-50 border-red-200' : 
                          submission.duplicate_risk === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' : 
                          'bg-green-50 border-green-200'
                        }`}>
                          <div className="text-xs text-muted-foreground">Duplicate Risk</div>
                          <div className="font-bold text-sm">{submission.duplicate_risk || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Detailed AI Insights (Expandable) */}
                      <CollapsibleContent>
                        <div className="space-y-3 bg-muted p-4 border rounded mt-3">
                          <div>
                            <div className="text-sm font-semibold mb-2">Platform Detection</div>
                            <div className="text-sm">
                              <span className="font-medium">Platform:</span> {submission.platform_detected || 'Not detected'}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold mb-2">Action Flags Detected</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className={submission.like_detected ? 'text-green-600' : 'text-gray-400'}>
                                  {submission.like_detected ? '✓' : '✗'}
                                </span>
                                <span>Like Detected</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={submission.comment_detected ? 'text-green-600' : 'text-gray-400'}>
                                  {submission.comment_detected ? '✓' : '✗'}
                                </span>
                                <span>Comment Detected</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={submission.repost_detected ? 'text-green-600' : 'text-gray-400'}>
                                  {submission.repost_detected ? '✓' : '✗'}
                                </span>
                                <span>Repost Detected</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={submission.tag_detected ? 'text-green-600' : 'text-gray-400'}>
                                  {submission.tag_detected ? '✓' : '✗'}
                                </span>
                                <span>Tag Detected</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={submission.original_post_detected ? 'text-green-600' : 'text-gray-400'}>
                                  {submission.original_post_detected ? '✓' : '✗'}
                                </span>
                                <span>Original Post Detected</span>
                              </div>
                            </div>
                          </div>

                          {submission.admin_notes && (
                            <div>
                              <div className="text-sm font-semibold mb-2">AI Recommendation</div>
                              <div className="text-sm bg-background p-3 border rounded">
                                {submission.admin_notes}
                              </div>
                            </div>
                          )}

                          {submission.workflow_id && (
                            <div>
                              <div className="text-sm font-semibold mb-1">Workflow ID</div>
                              <div className="text-xs text-muted-foreground font-mono">{submission.workflow_id}</div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Action Buttons */}
                    <Separator className="my-4" />
                    <div>
                      <div className="text-sm font-semibold mb-3">Admin Decision</div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => handleApprove(submission.id, 5)}
                            size="sm"
                            variant="outline"
                            disabled={processing === submission.id}
                          >
                            Approve: Like (5)
                          </Button>
                          <Button
                            onClick={() => handleApprove(submission.id, 10)}
                            size="sm"
                            variant="outline"
                            disabled={processing === submission.id}
                          >
                            Approve: Comment (10)
                          </Button>
                          <Button
                            onClick={() => handleApprove(submission.id, 15)}
                            size="sm"
                            variant="outline"
                            disabled={processing === submission.id}
                          >
                            Approve: Repost (15)
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={() => handleApprove(submission.id, 20)}
                            size="sm"
                            variant="outline"
                            disabled={processing === submission.id}
                          >
                            Approve: Tag (20)
                          </Button>
                          <Button
                            onClick={() => handleApprove(submission.id, 25)}
                            size="sm"
                            variant="outline"
                            disabled={processing === submission.id}
                          >
                            Approve: Original (25)
                          </Button>
                          <Button
                            onClick={() => handleReject(submission.id)}
                            size="sm"
                            variant="destructive"
                            disabled={processing === submission.id}
                          >
                            ✗ Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </ErrorBoundary>
  )
}
