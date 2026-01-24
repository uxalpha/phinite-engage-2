export interface User {
  id: string
  email: string
  name: string
  total_points: number
  created_at: string
}

export interface Submission {
  id: string
  user_id: string
  action_type: ActionType
  image_url: string
  
  // AI Verification Response
  workflow_id?: string
  platform_detected?: string
  like_detected?: boolean
  comment_detected?: boolean
  repost_detected?: boolean
  tag_detected?: boolean
  original_post_detected?: boolean
  primary_action?: string
  assigned_points?: number
  action_confidence?: number
  duplicate_risk?: string
  
  // Status
  status: SubmissionStatus
  points_awarded: number
  notes?: string
  admin_notes?: string
  
  submitted_at: string
  verified_at?: string
}

export type ActionType = 'LIKE' | 'COMMENT' | 'REPOST' | 'TAG' | 'ORIGINAL_POST'

export type SubmissionStatus = 'pending' | 'verified' | 'rejected' | 'manual_review'

export interface MonthlyPoints {
  id: string
  user_id: string
  month: string
  points: number
}

export interface LeaderboardEntry {
  id: string
  name: string
  email: string
  points: number
  rank: number
}

export interface AIVerificationRequest {
  image_url: string
}

export interface AIVerificationResponse {
  workflow_id: string
  proof_image: string
  platform_detected: string
  like_detected: boolean
  comment_detected: boolean
  repost_detected: boolean
  message_ui_detected: boolean
  original_post_detected: boolean
  link_preview_detected: boolean
  tag_detected: boolean
  ui_cues_list: string[]
  ownership_signals: string[]
  post_author_text: string
  timestamp_text: string
  link_domain_text: string
  primary_action: string
  assigned_points: number
  action_confidence: number
  classification_reasons: string[]
  content_quality_pass: boolean
  duplicate_risk: string
}
