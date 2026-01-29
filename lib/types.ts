export interface User {
  id: string
  email: string
  name: string
  total_points: number
  current_streak?: number
  longest_streak?: number
  last_activity_date?: string | null
  grace_day_used?: boolean
  grace_day_date?: string | null
  profile_image_url?: string
  unread_notifications_count?: number
  created_at?: string
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
  streak_multiplier?: number
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

// Some AI trigger calls may return a 200 "pending" payload first,
// and later return the full AIVerificationResponse.
export type AIVerificationResponseMaybe =
  Partial<AIVerificationResponse> & { status?: string; workflow_id?: string }

export interface StreakData {
  current_streak: number
  longest_streak: number
  current_multiplier: number
  grace_day_available: boolean
  grace_used_date: string | null
  last_activity_date: string | null
  calendar: DayStatus[]
  average_daily_points?: number
  multiplier_bonus?: number
}

export interface DayStatus {
  date: string
  status: 'verified' | 'missed' | 'grace_used'
  submission_count: number
}

export interface Notification {
  id: string
  user_id: string
  type: 'submission_approved' | 'submission_rejected' | 'points_awarded' | 'streak_milestone'
  title: string
  message: string
  related_submission_id?: string
  points_change?: number
  is_read: boolean
  created_at: string
}
