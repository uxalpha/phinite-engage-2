'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Notification, User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UserMenu from '@/components/UserMenu'
import NotificationBell from '@/components/NotificationBell'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const markedAsReadRef = useRef<Set<string>>(new Set())

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

    const fetchNotifications = async () => {
      try {
        const url = filter === 'unread' ? '/api/notifications?unread_only=true' : '/api/notifications'
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal
        })
        const data = await response.json()
        if (response.ok && isMounted) {
          setNotifications(data.notifications)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch notifications:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchNotifications()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [router, filter])

  useEffect(() => {
    // Set up Intersection Observer for viewport-based read tracking
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const notificationId = entry.target.getAttribute('data-notification-id')
          const isRead = entry.target.getAttribute('data-is-read') === 'true'

          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.5 &&
            notificationId &&
            !isRead &&
            !markedAsReadRef.current.has(notificationId)
          ) {
            // Mark as read after 1 second
            setTimeout(() => {
              if (entry.isIntersecting) {
                markNotificationAsRead(notificationId)
                markedAsReadRef.current.add(notificationId)
              }
            }, 1000)
          }
        })
      },
      { threshold: 0.5 }
    )

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    // Observe all notification cards when they mount
    const cards = document.querySelectorAll('[data-notification-id]')
    cards.forEach((card) => {
      if (observerRef.current) {
        observerRef.current.observe(card)
      }
    })

    return () => {
      if (observerRef.current) {
        cards.forEach((card) => {
          observerRef.current?.unobserve(card)
        })
      }
    }
  }, [notifications])


  const markNotificationAsRead = async (notificationId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )

      // Update user's unread count
      if (user) {
        const newCount = Math.max(0, (user.unread_notifications_count || 0) - 1)
        const updatedUser = { ...user, unread_notifications_count: newCount }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/auth')
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'submission_approved':
        return '✅'
      case 'submission_rejected':
        return '❌'
      case 'points_awarded':
        return '💰'
      case 'streak_milestone':
        return '🔥'
      default:
        return '📬'
    }
  }

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: [],
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const thisWeek = new Date(today.getTime() - 7 * 86400000)

    notifications.forEach((notification) => {
      const notifDate = new Date(notification.created_at)
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())

      if (notifDay.getTime() === today.getTime()) {
        groups['Today'].push(notification)
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(notification)
      } else if (notifDay >= thisWeek) {
        groups['This Week'].push(notification)
      } else {
        groups['Older'].push(notification)
      }
    })

    return groups
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-streak-gray">Loading...</div>
  }

  const groupedNotifications = groupNotificationsByDate(notifications)
  const filteredNotifications = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-streak-gray p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black">Notifications 🔔</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Stay updated on your activity</p>
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
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-card mb-6 inline-flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            onClick={() => {
              setFilter('all')
              fetchNotifications(localStorage.getItem('token') || '')
            }}
            className={`rounded-xl ${filter === 'all' ? 'bg-streak-purple hover:bg-streak-purple/90' : ''}`}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            onClick={() => {
              setFilter('unread')
              fetchNotifications(localStorage.getItem('token') || '')
            }}
            className={`rounded-xl ${filter === 'unread' ? 'bg-streak-purple hover:bg-streak-purple/90' : ''}`}
          >
            Unread ({notifications.filter((n) => !n.is_read).length})
          </Button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-card">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold mb-2">No notifications</h2>
            <p className="text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([group, groupNotifs]) => {
              if (groupNotifs.length === 0) return null

              return (
                <div key={group}>
                  <h3 className="text-sm font-bold text-muted-foreground mb-3 px-2">{group}</h3>
                  <div className="space-y-3">
                    {groupNotifs.map((notification) => (
                      <div
                        key={notification.id}
                        data-notification-id={notification.id}
                        data-is-read={notification.is_read.toString()}
                        className={`bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${
                          !notification.is_read ? 'border-l-4 border-streak-purple' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-4xl flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className={`font-bold ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <Badge className="bg-blue-500 text-white flex-shrink-0">New</Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-2">{notification.message}</p>
                            {notification.points_change && notification.points_change > 0 && (
                              <div className="inline-flex items-center gap-1 text-sm font-semibold text-streak-green bg-green-50 px-3 py-1 rounded-full mb-2">
                                +{notification.points_change} points
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {getRelativeTime(notification.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
