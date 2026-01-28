import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticate } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, profile_image_url, total_points, current_streak, longest_streak')
      .eq('id', auth.user.id)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { name, profile_image_url } = body

    // Validate name if provided
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (profile_image_url !== undefined) updates.profile_image_url = profile_image_url

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update user
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', auth.user.id)
      .select()
      .single()

    if (error || !updatedUser) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
