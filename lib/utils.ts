import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
  } catch {
    return null
  }
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const POINTS_MAP: Record<string, number> = {
  LIKE: 5,
  COMMENT: 10,
  REPOST: 15,
  TAG: 20,
  ORIGINAL_POST: 25
}

export function extractActionFromAI(primaryAction: string): string {
  const actionMap: Record<string, string> = {
    'LIKE': 'LIKE',
    'COMMENT': 'COMMENT',
    'REPOST': 'REPOST',
    'SHARE': 'REPOST',
    'TAG': 'TAG',
    'ORIGINAL_POST': 'ORIGINAL_POST',
    'ARTICLE': 'ORIGINAL_POST'
  }
  
  for (const [key, value] of Object.entries(actionMap)) {
    if (primaryAction.toUpperCase().includes(key)) {
      return value
    }
  }
  
  return 'LIKE' // Default fallback
}

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 10) return 2.0
  if (streakDays >= 5) return 1.5
  return 1.0
}

export function calculatePointsWithMultiplier(basePoints: number, multiplier: number): number {
  return Math.round(basePoints * multiplier)
}
