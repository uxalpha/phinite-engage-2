import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateUser } from '@/lib/middleware'
import type { SubmissionStatus } from '@/lib/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractProjectIdFromStartUrl(startUrl: string): string | null {
  try {
    // Expected format: https://ai-core-dev.phinite.ai/trigger/start/QZ-3DDP/16qObTjWO/development
    // We need to extract: QZ-3DDP
    const url = new URL(startUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    // parts = ["trigger", "start", "QZ-3DDP", "16qObTjWO", "development"]
    const triggerIdx = parts.indexOf('trigger')
    if (triggerIdx === -1) return null
    
    const startIdx = parts.indexOf('start', triggerIdx)
    if (startIdx === -1) return null
    
    // Project ID is right after 'start'
    const projectId = parts[startIdx + 1]
    return projectId || null
  } catch (e) {
    console.error('Failed to extract project ID from start URL:', e)
    return null
  }
}

function getAiStatusUrl(workflowId: string): string {
  const startUrl = process.env.AI_VERIFICATION_API_URL
  if (!startUrl) throw new Error('AI_VERIFICATION_API_URL is not set')

  try {
    // Extract project ID from start URL
    const projectId = extractProjectIdFromStartUrl(startUrl)
    if (!projectId) {
      throw new Error('Could not extract project ID from AI_VERIFICATION_API_URL')
    }

    // Build status URL: https://ai-core-dev.phinite.ai/trigger/status/QZ-3DDP/{workflow_id}
    const url = new URL(startUrl)
    return `${url.origin}/trigger/status/${projectId}/${workflowId}`
  } catch (e) {
    console.error('Failed to construct status URL:', e)
    throw new Error('Failed to construct AI status URL')
  }
}

async function fetchAiStatus(params: { workflowId: string; aiApiKey: string }) {
  const { workflowId, aiApiKey } = params

  // Build the status URL
  const statusUrl = getAiStatusUrl(workflowId)
  console.log('Fetching AI status from:', statusUrl)

  const res = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${aiApiKey}`,
      'Content-Type': 'application/json',
    },
  })

  const rawText = await res.text()
  console.log('AI status API response status:', res.status)
  console.log('AI status API response body:', rawText.substring(0, 500)) // Log first 500 chars

  if (!res.ok) {
    console.error('AI status API error:', { status: res.status, body: rawText })
    throw new Error(`AI status check failed: ${res.status}`)
  }

  let parsed: unknown
  try {
    parsed = rawText ? JSON.parse(rawText) : null
  } catch (e) {
    console.error('AI status API returned non-JSON:', rawText)
    throw new Error('AI status check failed: Invalid JSON response')
  }

  return { parsed, rawText, urlUsed: statusUrl }
}

function pickVerificationObject(aiPayload: unknown): Record<string, unknown> | null {
  if (!isRecord(aiPayload)) {
    console.log('AI payload is not a record:', typeof aiPayload)
    return null
  }
  
  // Status API wraps the real verification response under `response`.
  // Example: { workflow_id, response: { ...verification data... }, status, ... }
  if (isRecord(aiPayload.response)) {
    console.log('Found verification data in response object')
    return aiPayload.response
  }
  
  // Fallback: return the payload itself if no nested response
  console.log('Using top-level payload as verification object')
  return aiPayload
}

function getString(obj: Record<string, unknown>, key: string) {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}
function getNumber(obj: Record<string, unknown>, key: string) {
  const v = obj[key]
  return typeof v === 'number' ? v : undefined
}
function getBoolean(obj: Record<string, unknown>, key: string) {
  const v = obj[key]
  return typeof v === 'boolean' ? v : undefined
}

function decideSubmissionStatus(params: {
  actionType: string
  verification: Record<string, unknown>
}): { status: SubmissionStatus; pointsAwarded: number; reason: string } {
  const { actionType, verification } = params

  const contentQualityPass = getBoolean(verification, 'content_quality_pass')
  const actionConfidence = getNumber(verification, 'action_confidence')
  const assignedPoints = getNumber(verification, 'assigned_points') ?? 0
  const duplicateRisk = (getString(verification, 'duplicate_risk') ?? '').toUpperCase()

  // Hard fails -> reject.
  if (contentQualityPass === false) {
    return { status: 'rejected', pointsAwarded: 0, reason: 'Content quality failed' }
  }

  // Unknown/low confidence or risky -> manual review.
  if (duplicateRisk === 'HIGH') {
    return { status: 'manual_review', pointsAwarded: 0, reason: 'High duplicate risk' }
  }

  const minConfidence = 0.75
  if (typeof actionConfidence === 'number' && actionConfidence < minConfidence) {
    return { status: 'manual_review', pointsAwarded: 0, reason: `Low confidence (${actionConfidence})` }
  }

  const expectedFlagByAction: Record<string, string> = {
    LIKE: 'like_detected',
    COMMENT: 'comment_detected',
    REPOST: 'repost_detected',
    TAG: 'tag_detected',
    ORIGINAL_POST: 'original_post_detected',
  }

  const expectedFlag = expectedFlagByAction[actionType]
  if (expectedFlag) {
    const detected = getBoolean(verification, expectedFlag)
    if (detected === false) {
      return { status: 'rejected', pointsAwarded: 0, reason: `${expectedFlag} = false` }
    }
    if (detected === undefined) {
      return { status: 'manual_review', pointsAwarded: 0, reason: `Missing ${expectedFlag}` }
    }
  }

  // Default: verified if it assigned points, else manual review.
  if (assignedPoints > 0) {
    return { status: 'verified', pointsAwarded: assignedPoints, reason: 'Verified by AI' }
  }
  return { status: 'manual_review', pointsAwarded: 0, reason: 'No points assigned' }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const submissionId = request.nextUrl.searchParams.get('submission_id')
    if (!submissionId) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 })
    }

    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('user_id', auth.userId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // If already resolved, stop polling.
    if (submission.status !== 'pending') {
      return NextResponse.json({
        done: true,
        workflow_status: submission.status,
        message: `Submission is already ${submission.status}.`,
      })
    }

    if (!submission.workflow_id) {
      // Nothing to poll; push to manual review.
      await supabaseAdmin
        .from('submissions')
        .update({ status: 'manual_review', admin_notes: 'Missing workflow_id for AI status polling' })
        .eq('id', submissionId)

      return NextResponse.json({
        done: true,
        workflow_status: 'manual_review',
        message: 'Missing workflow id. Sent to manual review.',
      })
    }

    const aiApiKey = process.env.AI_VERIFICATION_API_KEY
    if (!aiApiKey) throw new Error('AI_VERIFICATION_API_KEY is not set')

    const { parsed } = await fetchAiStatus({
      workflowId: submission.workflow_id,
      aiApiKey,
    })

    if (!isRecord(parsed)) {
      console.error('AI status API returned non-object:', parsed)
      await supabaseAdmin
        .from('submissions')
        .update({
          status: 'manual_review',
          admin_notes: 'AI status returned invalid response format',
        })
        .eq('id', submissionId)

      return NextResponse.json({
        done: true,
        workflow_status: 'manual_review',
        message: 'AI response was malformed. Sent to manual review.',
      })
    }

    const outer = parsed
    const workflowStatus = typeof outer.status === 'string' ? outer.status : 'pending'
    const requiresInput = outer.requires_input === true
    const errorMessage = typeof outer.error === 'string' ? outer.error : outer.error ? JSON.stringify(outer.error) : null

    console.log('Workflow status:', workflowStatus, 'Requires input:', requiresInput, 'Error:', errorMessage)

    // Still running - keep polling
    if (workflowStatus === 'pending' && !requiresInput && !errorMessage) {
      console.log('Workflow still pending, continue polling')
      return NextResponse.json({ done: false, workflow_status: workflowStatus })
    }

    // Extract verification data from the response
    const verification = pickVerificationObject(parsed)
    if (!verification) {
      console.error('Could not extract verification object from response')
      await supabaseAdmin
        .from('submissions')
        .update({
          status: 'manual_review',
          admin_notes: 'AI status returned unexpected payload (missing response object)',
        })
        .eq('id', submissionId)

      return NextResponse.json({
        done: true,
        workflow_status: 'manual_review',
        message: 'AI response was malformed. Sent to manual review.',
      })
    }

    // Persist verification fields from the nested `response` object.
    const updatePayload: Record<string, unknown> = {
      platform_detected: getString(verification, 'platform_detected'),
      like_detected: getBoolean(verification, 'like_detected'),
      comment_detected: getBoolean(verification, 'comment_detected'),
      repost_detected: getBoolean(verification, 'repost_detected'),
      tag_detected: getBoolean(verification, 'tag_detected'),
      original_post_detected: getBoolean(verification, 'original_post_detected'),
      primary_action: getString(verification, 'primary_action'),
      assigned_points: getNumber(verification, 'assigned_points'),
      action_confidence: getNumber(verification, 'action_confidence'),
      duplicate_risk: getString(verification, 'duplicate_risk'),
    }

    // If the workflow errored or needs input, send to manual review and keep the parsed fields for admin visibility.
    if (requiresInput || errorMessage) {
      console.log('Workflow needs manual review due to error or input required')
      updatePayload.status = 'manual_review'
      updatePayload.admin_notes = errorMessage
        ? `AI workflow error: ${errorMessage}`
        : 'AI workflow requires input'

      await supabaseAdmin.from('submissions').update(updatePayload).eq('id', submissionId)

      return NextResponse.json({
        done: true,
        workflow_status: 'manual_review',
        message: 'Verification needs manual review.',
      })
    }

    // Workflow must be completed to proceed with verification decision
    if (workflowStatus !== 'completed') {
      console.log('Workflow not completed yet, status:', workflowStatus)
      updatePayload.status = 'manual_review'
      updatePayload.admin_notes = `AI workflow ended with status: ${workflowStatus}`
      await supabaseAdmin.from('submissions').update(updatePayload).eq('id', submissionId)

      return NextResponse.json({
        done: true,
        workflow_status: 'manual_review',
        message: 'Verification needs manual review.',
      })
    }

    console.log('Workflow completed, sending to admin review with AI insights')
    
    // Always send to manual review for admin to make final decision
    // Admin will see all AI insights and can approve/reject with custom points
    const decision = decideSubmissionStatus({
      actionType: submission.action_type,
      verification,
    })
    console.log('AI Recommendation:', decision)

    updatePayload.status = 'manual_review'
    updatePayload.points_awarded = 0  // Points awarded only after admin approval
    updatePayload.verified_at = null
    updatePayload.admin_notes = `AI Recommendation: ${decision.status} (${decision.reason}). Suggested points: ${decision.pointsAwarded}`

    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId)

    if (updateError) {
      console.error('Status update error:', updateError)
      return NextResponse.json({ error: 'Failed to update submission status' }, { status: 500 })
    }

    return NextResponse.json({
      done: true,
      workflow_status: 'manual_review',
      message: 'Submission received and analyzed by AI. Awaiting admin review for final approval.',
      ai_recommendation: {
        status: decision.status,
        suggested_points: decision.pointsAwarded,
        reason: decision.reason
      }
    })
  } catch (error) {
    console.error('Submit status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
