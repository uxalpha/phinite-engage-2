'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function SubmissionFAB() {
  const router = useRouter()

  return (
    <Button
      onClick={() => router.push('/submit')}
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-16 w-16 rounded-full bg-gradient-to-br from-streak-purple to-purple-600 hover:from-streak-purple/90 hover:to-purple-600/90 shadow-2xl z-50 animate-pulse-fab flex items-center justify-center text-4xl"
      aria-label="New Submission"
    >
      🔥
    </Button>
  )
}
