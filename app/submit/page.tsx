'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import UserMenu from '@/components/UserMenu'
import NotificationBell from '@/components/NotificationBell'

interface User {
  id: string
  name: string
  email: string
  total_points: number
  unread_notifications_count?: number
  profile_image_url?: string
}

export default function SubmitPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
  }, [router])

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

      setMessage('✅ Submission received successfully! AI is analyzing your proof in the background.')
      setFormData({ action_type: 'LIKE', file: null, notes: '' })
      
      const fileInput = document.getElementById('file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Redirect to recent submissions after 2 seconds
      setTimeout(() => {
        router.push('/recent')
      }, 2000)
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

  const getPoints = (actionType: string) => {
    switch (actionType) {
      case 'LIKE': return 5
      case 'COMMENT': return 10
      case 'REPOST': return 15
      case 'TAG': return 20
      case 'ORIGINAL_POST': return 25
      default: return 0
    }
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-streak-gray">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-streak-gray p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black">New Submission 🚀</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Upload proof of your LinkedIn activity</p>
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

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Submission Form - Takes 2 columns */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-card-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-streak-purple rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Submit Activity</h2>
                  <p className="text-sm text-muted-foreground">LinkedIn engagement proof</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="action_type" className="text-base font-semibold">Activity Type *</Label>
                  <Select
                    value={formData.action_type}
                    onValueChange={(value) => setFormData({ ...formData, action_type: value })}
                  >
                    <SelectTrigger id="action_type" className="h-12 rounded-xl">
                      <SelectValue placeholder="Select activity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIKE">👍 Like (5 points)</SelectItem>
                      <SelectItem value="COMMENT">💬 Comment (10 points)</SelectItem>
                      <SelectItem value="REPOST">🔄 Repost (15 points)</SelectItem>
                      <SelectItem value="TAG">🏷️ Tag a Teammate (20 points)</SelectItem>
                      <SelectItem value="ORIGINAL_POST">✍️ Original Post (25 points)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the type of LinkedIn activity you performed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file" className="text-base font-semibold">Proof Screenshot *</Label>
                  <div className="relative">
                    <Input
                      id="file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                      required
                      className="h-12 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-streak-purple file:text-white hover:file:bg-streak-purple/90"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a clear screenshot showing your LinkedIn activity
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-base font-semibold">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional context or details..."
                    className="rounded-xl resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide extra context if needed
                  </p>
                </div>

                {message && (
                  <Alert className="bg-green-50 border-green-200 rounded-xl">
                    <AlertDescription className="text-green-800">{message}</AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold rounded-xl bg-streak-purple hover:bg-streak-purple/90" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="animate-pulse">Submitting...</span>
                    </>
                  ) : (
                    <>Submit Proof 🎯</>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Points Info Sidebar */}
          <div className="md:col-span-1 space-y-4">
            {/* Points Breakdown Card */}
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💎</span>
                <h3 className="text-lg font-bold">Points Breakdown</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">👍 Like</span>
                  <span className="font-bold text-streak-purple">5 pts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">💬 Comment</span>
                  <span className="font-bold text-streak-purple">10 pts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">🔄 Repost</span>
                  <span className="font-bold text-streak-purple">15 pts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">🏷️ Tag</span>
                  <span className="font-bold text-streak-purple">20 pts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">✍️ Post</span>
                  <span className="font-bold text-streak-purple">25 pts</span>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div 
              className="rounded-2xl p-6 shadow-card text-white"
              style={{
                background: 'linear-gradient(135deg, #FFD60A 0%, #FF9500 100%)'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💡</span>
                <h3 className="text-lg font-bold text-gray-900">Pro Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-800">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Include full screenshot showing activity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Submit on the same day for streak credit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Clear, unedited images process faster</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Keep your streak alive for bonus multipliers!</span>
                </li>
              </ul>
            </div>

            {/* Quick Stats */}
            <div className="bg-streak-purple rounded-2xl p-6 shadow-card text-white">
              <div className="text-center">
                <div className="text-4xl font-black mb-2">{getPoints(formData.action_type)}</div>
                <div className="text-sm opacity-90">Base Points</div>
                <div className="text-xs opacity-75 mt-2">+ Streak Multiplier</div>
              </div>
            </div>
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
