import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateUser } from '@/lib/middleware'
import { AIVerificationResponse, ActionType } from '@/lib/types'
import { extractActionFromAI, POINTS_MAP } from '@/lib/utils'

type AIVerificationFinal = {
  workflow_id: string
  platform_detected: string
  like_detected?: boolean
  comment_detected?: boolean
  repost_detected?: boolean
  tag_detected?: boolean
  original_post_detected?: boolean
  primary_action: string
  assigned_points: number
  action_confidence: number
  duplicate_risk: string
}

type AIVerificationMaybe = Partial<AIVerificationResponse> & {
  status?: string
  workflow_id?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jitterMs(ms: number, jitterRatio: number) {
  const jitter = ms * jitterRatio * (Math.random() * 2 - 1) // +/- jitterRatio
  return Math.max(0, Math.round(ms + jitter))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAIVerificationFinal(value: unknown): value is AIVerificationFinal {
  if (!isRecord(value)) return false

  return (
    typeof value.workflow_id === 'string' &&
    typeof value.platform_detected === 'string' &&
    typeof value.primary_action === 'string' &&
    typeof value.assigned_points === 'number' &&
    typeof value.action_confidence === 'number' &&
    typeof value.duplicate_risk === 'string'
  )
}

async function fetchAiVerificationWithPolling(params: {
  aiApiUrl: string
  aiApiKey: string
  imageUrl: string
  maxWaitMs?: number
  initialDelayMs?: number
  maxDelayMs?: number
  jitterRatio?: number
}) {
  const {
    aiApiUrl,
    aiApiKey,
    imageUrl,
    maxWaitMs = 45_000,
    initialDelayMs = 900,
    maxDelayMs = 5_000,
    jitterRatio = 0.15,
  } = params

  const startedAt = Date.now()
  let attempt = 0
  let delayMs = initialDelayMs
  let lastWorkflowId: string | undefined

  while (Date.now() - startedAt < maxWaitMs) {
    attempt += 1

    const aiResponse = await fetch(aiApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proof_image: imageUrl }),
    })

    const rawText = await aiResponse.text()

    if (!aiResponse.ok) {
      console.error('AI API error:', rawText)
      throw new Error('AI verification failed')
    }

    let parsed: unknown
    try {
      parsed = rawText ? JSON.parse(rawText) : null
    } catch (e) {
      console.error('AI API returned non-JSON body:', rawText)
      throw new Error('AI verification failed')
    }

    if (isAIVerificationFinal(parsed)) {
      return { aiData: parsed, workflowId: parsed.workflow_id, timedOut: false as const }
    }

    const maybe = (isRecord(parsed) ? (parsed as AIVerificationMaybe) : undefined)
    if (maybe?.workflow_id && typeof maybe.workflow_id === 'string') {
      lastWorkflowId = maybe.workflow_id
    }

    const status = typeof maybe?.status === 'string' ? maybe.status.toLowerCase() : undefined
    const looksPending =
      status === undefined ||
      status === 'pending' ||
      status === 'queued' ||
      status === 'running'

    // If it's not final, we wait and retry (bounded by timeout).
    if (attempt === 1 || attempt % 5 === 0) {
      console.info('AI verification not final yet; retrying', {
        attempt,
        workflow_id: lastWorkflowId,
        status,
      })
    }

    if (!looksPending) {
      // Non-final but also not explicitly pending; still retry until timeout since
      // the trigger is expected to eventually produce the final payload.
    }

    await sleep(jitterMs(delayMs, jitterRatio))
    delayMs = Math.min(Math.round(delayMs * 1.6), maxDelayMs)
  }

  return { aiData: null, workflowId: lastWorkflowId, timedOut: true as const }
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

    // Call AI Verification API (poll until final result or timeout)
    const aiApiUrl = process.env.AI_VERIFICATION_API_URL!
    const aiApiKey = process.env.AI_VERIFICATION_API_KEY!
    const { aiData, workflowId, timedOut } = await fetchAiVerificationWithPolling({
      aiApiUrl,
      aiApiKey,
      imageUrl,
    })

    // Determine verification status
    let status: 'verified' | 'rejected' | 'manual_review' = 'manual_review'
    let pointsAwarded = 0
    
    if (aiData) {
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
    } else {
      // AI workflow didn't finalize within our timeout window.
      // Fall back to manual review so the user isn't stuck on "pending".
      status = 'manual_review'
      pointsAwarded = 0
    }

    // Create submission record
    const insertPayload: Record<string, unknown> = {
      user_id: auth.userId,
      action_type: actionType,
      image_url: imageUrl,
      status,
      points_awarded: pointsAwarded,
      notes,
      verified_at: status === 'verified' ? new Date().toISOString() : null,
    }

    if (workflowId) {
      insertPayload.workflow_id = workflowId
    }

    if (aiData) {
      insertPayload.platform_detected = aiData.platform_detected
      if (typeof aiData.like_detected === 'boolean') insertPayload.like_detected = aiData.like_detected
      if (typeof aiData.comment_detected === 'boolean') insertPayload.comment_detected = aiData.comment_detected
      if (typeof aiData.repost_detected === 'boolean') insertPayload.repost_detected = aiData.repost_detected
      if (typeof aiData.tag_detected === 'boolean') insertPayload.tag_detected = aiData.tag_detected
      if (typeof aiData.original_post_detected === 'boolean') insertPayload.original_post_detected = aiData.original_post_detected
      insertPayload.primary_action = aiData.primary_action
      insertPayload.assigned_points = aiData.assigned_points
      insertPayload.action_confidence = aiData.action_confidence
      insertPayload.duplicate_risk = aiData.duplicate_risk
    }

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
      message: status === 'verified' 
        ? `Verified! You earned ${pointsAwarded} points.`
        : status === 'rejected'
        ? 'Submission rejected. Please ensure you upload a valid LinkedIn activity screenshot.'
        : timedOut
        ? 'Submission received. Verification is taking longer than usual. Pending manual review.'
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
