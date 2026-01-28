'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NotificationBellProps {
  unreadCount: number
}

export default function NotificationBell({ unreadCount }: NotificationBellProps) {
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative h-10 w-10 rounded-full hover:bg-gray-100"
      onClick={() => router.push('/notifications')}
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
}
