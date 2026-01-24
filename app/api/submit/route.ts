import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateUser } from '@/lib/middleware'
import { AIVerificationResponse, ActionType } from '@/lib/types'
import { extractActionFromAI, POINTS_MAP } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request)
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const formData = await request.formData()
    const actionType = formData.get('action_type') as ActionType
    const file = formData.get('file') as File
    const notes = formData.get('notes') as string | null

    // Validation
    if (!actionType || !file) {
      return NextResponse.json(
        { error: 'Action type and proof image are required' },
        { status: 400 }
      )
    }

    if (!['LIKE', 'COMMENT', 'REPOST', 'TAG', 'ORIGINAL_POST'].includes(actionType)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      )
    }

    // Upload image to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${auth.userId}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('proof-images')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('proof-images')
      .getPublicUrl(filePath)

    const imageUrl = urlData.publicUrl

    // Call AI Verification API
    const aiApiUrl = process.env.AI_VERIFICATION_API_URL!
    const aiApiKey = process.env.AI_VERIFICATION_API_KEY!

    const aiResponse = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ proof_image: imageUrl })
    })

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text())
      return NextResponse.json(
        { error: 'AI verification failed' },
        { status: 500 }
      )
    }

    const aiData: AIVerificationResponse = await aiResponse.json()

    // Determine verification status
    let status: 'verified' | 'rejected' | 'manual_review' = 'manual_review'
    let pointsAwarded = 0
    
    // Check if platform is LinkedIn
    if (aiData.platform_detected !== 'LinkedIn') {
      status = 'rejected'
    }
    // Check confidence threshold
    else if (aiData.action_confidence >= 0.8) {
      status = 'verified'
      pointsAwarded = aiData.assigned_points
    }
    // Check duplicate risk
    else if (aiData.duplicate_risk === 'HIGH') {
      status = 'rejected'
    }
    // Check if user-claimed action matches AI detection
    else {
      const detectedAction = extractActionFromAI(aiData.primary_action)
      if (detectedAction === actionType && aiData.action_confidence >= 0.6) {
        status = 'verified'
        pointsAwarded = POINTS_MAP[actionType]
      }
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert({
        user_id: auth.userId,
        action_type: actionType,
        image_url: imageUrl,
        workflow_id: aiData.workflow_id,
        platform_detected: aiData.platform_detected,
        like_detected: aiData.like_detected,
        comment_detected: aiData.comment_detected,
        repost_detected: aiData.repost_detected,
        tag_detected: aiData.tag_detected,
        original_post_detected: aiData.original_post_detected,
        primary_action: aiData.primary_action,
        assigned_points: aiData.assigned_points,
        action_confidence: aiData.action_confidence,
        duplicate_risk: aiData.duplicate_risk,
        status,
        points_awarded: pointsAwarded,
        notes,
        verified_at: status === 'verified' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Submission error:', submissionError)
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      submission,
      message: status === 'verified' 
        ? `Verified! You earned ${pointsAwarded} points.`
        : status === 'rejected'
        ? 'Submission rejected. Please ensure you upload a valid LinkedIn activity screenshot.'
        : 'Submission received. Pending manual review.'
    })
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
