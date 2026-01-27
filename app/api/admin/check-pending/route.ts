import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authenticateAdmin } from '@/lib/middleware'

// Import the status checking logic
function extractProjectIdFromStartUrl(startUrl: string): string | null {
  try {
    const url = new URL(startUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const triggerIdx = parts.indexOf('trigger')
    if (triggerIdx === -1) return null
    
    const startIdx = parts.indexOf('start', triggerIdx)
    if (startIdx === -1) return null
    
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

  const projectId = extractProjectIdFromStartUrl(startUrl)
  if (!projectId) {
    throw new Error('Could not extract project ID from AI_VERIFICATION_API_URL')
  }

  const url = new URL(startUrl)
  return `${url.origin}/trigger/status/${projectId}/${workflowId}`
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const auth = await authenticateAdmin(request)
    if ('error' in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    // Get all pending submissions with workflow_ids
    const { data: pendingSubmissions, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('id, user_id, workflow_id, action_type')
      .eq('status', 'pending')
      .not('workflow_id', 'is', null)

    if (fetchError) {
      console.error('Fetch pending error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch pending submissions' },
        { status: 500 }
      )
    }

    console.log(`Found ${pendingSubmissions?.length || 0} pending submissions with workflow_ids`)

    if (!pendingSubmissions || pendingSubmissions.length === 0) {
      return NextResponse.json({
        message: 'No pending submissions to check',
        checked: 0,
        updated: 0
      })
    }

    const aiApiKey = process.env.AI_VERIFICATION_API_KEY
    if (!aiApiKey) {
      throw new Error('AI_VERIFICATION_API_KEY is not set')
    }

    let updated = 0
    const results: any[] = []

    // Check status for each pending submission
    for (const submission of pendingSubmissions) {
      try {
        const statusUrl = getAiStatusUrl(submission.workflow_id)
        
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          results.push({
            id: submission.id,
            status: 'error',
            message: `API returned ${response.status}`
          })
          continue
        }

        const data = await response.json()
        const workflowStatus = typeof data.status === 'string' ? data.status : 'pending'

        // If still pending, skip
        if (workflowStatus === 'pending') {
          results.push({
            id: submission.id,
            status: 'still_pending',
            message: 'AI still processing'
          })
          continue
        }

        // If completed, update to manual_review
        if (workflowStatus === 'completed' && data.response) {
          const verification = data.response

          const updatePayload: Record<string, unknown> = {
            status: 'manual_review',
            platform_detected: verification.platform_detected,
            like_detected: verification.like_detected,
            comment_detected: verification.comment_detected,
            repost_detected: verification.repost_detected,
            tag_detected: verification.tag_detected,
            original_post_detected: verification.original_post_detected,
            primary_action: verification.primary_action,
            assigned_points: verification.assigned_points,
            action_confidence: verification.action_confidence,
            duplicate_risk: verification.duplicate_risk,
            admin_notes: `AI Recommendation: Suggested points: ${verification.assigned_points || 0}`
          }

          await supabaseAdmin
            .from('submissions')
            .update(updatePayload)
            .eq('id', submission.id)

          updated++
          results.push({
            id: submission.id,
            status: 'updated',
            message: 'Moved to manual_review'
          })
        } else {
          // Error or requires input
          await supabaseAdmin
            .from('submissions')
            .update({
              status: 'manual_review',
              admin_notes: `AI workflow status: ${workflowStatus}`
            })
            .eq('id', submission.id)

          updated++
          results.push({
            id: submission.id,
            status: 'updated',
            message: `Moved to manual_review (${workflowStatus})`
          })
        }
      } catch (err: any) {
        console.error(`Error checking submission ${submission.id}:`, err)
        results.push({
          id: submission.id,
          status: 'error',
          message: err.message
        })
      }
    }

    return NextResponse.json({
      message: `Checked ${pendingSubmissions.length} submissions, updated ${updated}`,
      checked: pendingSubmissions.length,
      updated,
      results
    })
  } catch (error) {
    console.error('Check pending error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
