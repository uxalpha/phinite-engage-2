import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateUser } from '@/lib/middleware'
import { ActionType } from '@/lib/types'
import { calculateStreakStatus, getStreakMultiplier } from '@/lib/streak'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getAiStartUrl() {
  const raw = process.env.AI_VERIFICATION_API_URL
  if (!raw) throw new Error('AI_VERIFICATION_API_URL is not set')
  return raw
}

async function startAiWorkflow(params: {
  aiStartUrl: string
  aiApiKey: string
  imageUrl: string
}) {
  const { aiStartUrl, aiApiKey, imageUrl } = params

  console.log('Starting AI workflow with URL:', aiStartUrl)

  const res = await fetch(aiStartUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_variables: { proof_image: imageUrl },
    }),
  })

  const rawText = await res.text()
  console.log('AI start API response status:', res.status)
  console.log('AI start API response body:', rawText)

  if (!res.ok) {
    console.error('AI start API error:', rawText)
    throw new Error(`AI workflow start failed: ${res.status} ${rawText}`)
  }

  let parsed: unknown
  try {
    parsed = rawText ? JSON.parse(rawText) : null
  } catch (e) {
    console.error('AI start API returned non-JSON body:', rawText)
    throw new Error('AI workflow start failed: Invalid JSON response')
  }

  if (!isRecord(parsed) || typeof parsed.workflow_id !== 'string') {
    console.error('AI start API returned unexpected payload:', parsed)
    throw new Error('AI workflow start failed: Missing workflow_id')
  }

  return { 
    workflowId: parsed.workflow_id, 
    status: typeof parsed.status === 'string' ? parsed.status : 'pending' 
  }
}

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
    const timezoneOffset = parseInt(formData.get('timezone') as string || '0')

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

    // Calculate current streak multiplier at submission time
    const streakData = await calculateStreakStatus(auth.userId, timezoneOffset)
    const currentMultiplier = getStreakMultiplier(streakData.current_streak)

    // Call AI Trigger Start API (async verification; client polls /api/submit/status)
    const aiStartUrl = getAiStartUrl()
    const aiApiKey = process.env.AI_VERIFICATION_API_KEY!
    const { workflowId } = await startAiWorkflow({
      aiStartUrl,
      aiApiKey,
      imageUrl,
    })

    // Create submission record
    const insertPayload: Record<string, unknown> = {
      user_id: auth.userId,
      action_type: actionType,
      image_url: imageUrl,
      status: 'pending',
      points_awarded: 0,
      streak_multiplier: currentMultiplier,
      notes,
      verified_at: null,
    }

    insertPayload.workflow_id = workflowId

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert(insertPayload)
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
      workflow_id: workflowId,
      message: 'Submission received. Verification started — checking status every 10 seconds.'
    })
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
