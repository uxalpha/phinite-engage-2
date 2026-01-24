import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/utils'
import { supabaseAdmin } from '@/lib/supabase'

export async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 }
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return { error: 'Invalid or expired token', status: 401 }
  }

  return { userId: payload.userId, email: payload.email }
}

export async function authenticateAdmin(request: NextRequest) {
  const auth = await authenticateUser(request)
  
  if ('error' in auth) {
    return auth
  }

  // Check if user is admin
  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('user_id', auth.userId)
    .single()

  if (!admin) {
    return { error: 'Admin access required', status: 403 }
  }

  return auth
}
