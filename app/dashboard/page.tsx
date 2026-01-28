'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

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
    fetchUserData(token)
    fetchSubmissions(token)
  }, [router])


  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok && data.user) {
        setUser(data.user)
        // Update localStorage with fresh user data
        localStorage.setItem('user', JSON.stringify(data.user))
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    }
  }

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
      // Add timezone offset for streak calculation
      const timezoneOffset = -new Date().getTimezoneOffset()
      formDataToSend.append('timezone', timezoneOffset.toString())

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

      // Refresh user data and submissions to show updates
      fetchUserData(token)
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
            <p className="text-muted-foreground mt-1">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Points</div>
              <div className="text-2xl font-bold">{user.total_points}</div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-8 border-b pb-4">
          <Button variant="ghost" className="font-medium border-b-2 border-primary rounded-none">
            Submit Proof
          </Button>
          <Button variant="ghost" onClick={() => router.push('/streak')}>
            Streak
          </Button>
          <Button variant="ghost" onClick={() => router.push('/leaderboard')}>
            Leaderboard
          </Button>
          {user.email === 'ashish.deekonda@phinite.ai' && (
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              Admin
            </Button>
          )}
        </div>

        {/* Platform Tabs */}
        <Tabs defaultValue="linkedin" className="mb-8" onValueChange={(val) => setActivePlatform(val as Platform)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            <TabsTrigger value="twitter" disabled>Twitter</TabsTrigger>
            <TabsTrigger value="instagram" disabled>Instagram</TabsTrigger>
            <TabsTrigger value="reddit" disabled>Reddit</TabsTrigger>
          </TabsList>

          <TabsContent value="linkedin" className="space-y-8">
            {/* Submit Form */}
            <Card>
              <CardHeader>
                <CardTitle>Submit LinkedIn Activity</CardTitle>
                <CardDescription>Upload proof of your engagement to earn points</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="action_type">Activity Type *</Label>
                    <Select
                      value={formData.action_type}
                      onValueChange={(value) => setFormData({ ...formData, action_type: value })}
                    >
                      <SelectTrigger id="action_type">
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LIKE">Like (5 points)</SelectItem>
                        <SelectItem value="COMMENT">Comment (10 points)</SelectItem>
                        <SelectItem value="REPOST">Repost (15 points)</SelectItem>
                        <SelectItem value="TAG">Tag a Teammate (20 points)</SelectItem>
                        <SelectItem value="ORIGINAL_POST">Original Post (25 points)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">Proof Screenshot *</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot of your LinkedIn activity
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional context..."
                    />
                  </div>

                  {message && (
                    <Alert>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Proof'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <CardTitle>Your Submissions</CardTitle>
                <CardDescription>Recent activity submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No submissions yet</p>
                ) : (
                  <div className="space-y-4">
                    {submissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4">
                        <img
                          src={submission.image_url}
                          alt="Proof"
                          className="w-full md:w-24 h-24 object-cover border rounded"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">{submission.action_type.replace('_', ' ')}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge variant={submission.status as any}>
                              {submission.status === 'manual_review' ? 'PENDING ADMIN REVIEW' : submission.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          {submission.status === 'verified' && (
                            <div className="text-sm font-medium">+{submission.points_awarded} points</div>
                          )}
                          {submission.notes && (
                            <div className="text-sm text-muted-foreground mt-2">{submission.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="twitter">
            <Card className="text-center py-16">
              <CardContent>
                <div className="text-6xl mb-4">🚧</div>
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground">Twitter integration is coming soon!</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instagram">
            <Card className="text-center py-16">
              <CardContent>
                <div className="text-6xl mb-4">🚧</div>
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground">Instagram integration is coming soon!</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reddit">
            <Card className="text-center py-16">
              <CardContent>
                <div className="text-6xl mb-4">🚧</div>
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p className="text-muted-foreground">Reddit integration is coming soon!</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
