'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import UserMenu from '@/components/UserMenu'
import NotificationBell from '@/components/NotificationBell'
import ErrorBoundary from '@/components/ErrorBoundary'
import { compressImage, isValidImageFile, isValidImageSize } from '@/lib/imageUtils'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile state
  const [name, setName] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/auth')
      return
    }

    if (isMounted) {
      const userObj = JSON.parse(userData)
      setUser(userObj)
      setName(userObj.name)
      setProfileImageUrl(userObj.profile_image_url || '')
      setLoading(false)
    }

    return () => {
      isMounted = false
    }
  }, [router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file
      if (!isValidImageFile(file)) {
        setProfileError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
        return
      }
      
      if (!isValidImageSize(file, 5)) {
        setProfileError('File size must be less than 5MB')
        return
      }

      setProfileError('')
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleProfileUpdate = async () => {
    setProfileError('')
    setProfileMessage('')
    setProfileSaving(true)

    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }

    try {
      let imageUrl = profileImageUrl

      // Upload avatar if file selected
      if (avatarFile) {
        // Compress image before uploading
        setCompressing(true)
        const compressedFile = await compressImage(avatarFile)
        setCompressing(false)

        const formData = new FormData()
        formData.append('file', compressedFile)

        const uploadResponse = await fetch('/api/user/upload-avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || 'Avatar upload failed')
        }

        imageUrl = uploadData.image_url
      }

      // Update profile
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          profile_image_url: imageUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed')
      }

      // Update local storage and state
      const updatedUser = { ...user, ...data.user }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setProfileImageUrl(imageUrl)
      setAvatarFile(null)
      setAvatarPreview(null)

      setProfileMessage('Profile updated successfully!')
    } catch (err: any) {
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
      setCompressing(false)
    }
  }

  const handlePasswordUpdate = async () => {
    setPasswordError('')
    setPasswordMessage('')

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordSaving(true)

    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth')
      return
    }

    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Password update failed')
      }

      setPasswordMessage('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-streak-gray">Loading...</div>
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-streak-gray p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black">Settings ⚙️</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your account preferences</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <NotificationBell unreadCount={user.unread_notifications_count || 0} />
              <UserMenu user={user} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
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
        </div>

        {/* Profile Settings */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card-lg mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">👤</span>
            <div>
              <h2 className="text-2xl font-bold">Profile Settings</h2>
              <p className="text-sm text-muted-foreground">Update your personal information</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="space-y-3">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarPreview || profileImageUrl ? (
                    <img
                      src={avatarPreview || profileImageUrl}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-streak-purple flex items-center justify-center text-white text-2xl font-bold">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="rounded-xl bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {profileMessage && (
              <Alert className="bg-green-50 border-green-200 rounded-xl">
                <AlertDescription className="text-green-800">{profileMessage}</AlertDescription>
              </Alert>
            )}

            {profileError && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleProfileUpdate}
              disabled={profileSaving || compressing || !name.trim()}
              className="w-full md:w-auto bg-streak-purple hover:bg-streak-purple/90 rounded-xl"
            >
              {compressing ? 'Compressing...' : profileSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card-lg mb-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🔒</span>
            <div>
              <h2 className="text-2xl font-bold">Security Settings</h2>
              <p className="text-sm text-muted-foreground">Change your password</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password *</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password *</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password *</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="rounded-xl"
              />
            </div>

            {passwordMessage && (
              <Alert className="bg-green-50 border-green-200 rounded-xl">
                <AlertDescription className="text-green-800">{passwordMessage}</AlertDescription>
              </Alert>
            )}

            {passwordError && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handlePasswordUpdate}
              disabled={passwordSaving}
              className="w-full md:w-auto bg-streak-purple hover:bg-streak-purple/90 rounded-xl"
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="rounded-full">
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
