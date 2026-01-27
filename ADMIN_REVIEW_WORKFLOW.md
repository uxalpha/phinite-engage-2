# Admin Review Workflow

## Overview

All submissions now go through an admin review process after AI analysis. This ensures quality control and allows admins to make final decisions on point awards based on detailed AI insights.

## Workflow Steps

### 1. User Submission
- User uploads a LinkedIn activity screenshot
- Submission is immediately created with `pending` status
- AI workflow is triggered in the background
- User sees: "Submission received. Starting verification..."

### 2. AI Analysis (~3 minutes)
- AI analyzes the screenshot using computer vision and NLP
- Extracts detailed information:
  - Platform detected (LinkedIn, etc.)
  - Action flags (like, comment, repost, tag, original post)
  - Primary action detected
  - Confidence score
  - Duplicate risk assessment
  - Suggested points

### 3. Admin Review Queue
- Once AI completes analysis, submission moves to `manual_review` status
- User sees: "AI analysis complete! Your submission is now in the admin review queue."
- Admin can view:
  - **Screenshot**: Full-size proof image
  - **User Info**: Name, email, claimed action
  - **AI Insights**: 
    - Detected action vs. claimed action
    - Confidence score
    - All action flags
    - Duplicate risk
    - Platform detection
    - AI recommendation and reasoning
    - Workflow ID for troubleshooting

### 4. Admin Decision
Admin reviews the submission and can:
- **Approve with points**: 
  - Like (5 points)
  - Comment (10 points)
  - Repost (15 points)
  - Tag (20 points)
  - Original Post (25 points)
- **Reject**: No points awarded

### 5. Points Award
- After admin approval:
  - Submission status → `verified`
  - Points added to user's total_points
  - Points added to monthly_points
  - User can see updated points on dashboard

## Admin Interface Features

### Quick Summary Cards
Always visible for each submission:
- **AI Detected Action**: What the AI thinks the action is
- **Confidence**: How confident the AI is (0-100%)
- **Suggested Points**: AI recommendation for points
- **Duplicate Risk**: LOW/MEDIUM/HIGH risk assessment

### Expandable AI Insights
Click "+" to see detailed analysis:
- Platform Detection
- Action Flags (checkmarks for detected actions):
  - ✓ Like Detected
  - ✓ Comment Detected
  - ✓ Repost Detected
  - ✓ Tag Detected
  - ✓ Original Post Detected
- AI Recommendation (full reasoning)
- Workflow ID (for debugging)

### Decision Buttons
Six clear action buttons:
- Approve: Like (5)
- Approve: Comment (10)
- Approve: Repost (15)
- Approve: Tag (20)
- Approve: Original (25)
- Reject (red button)

## Decision Making Guide

### When to Trust AI Recommendation
- ✅ High confidence (>85%)
- ✅ Low duplicate risk
- ✅ Detected action matches claimed action
- ✅ Clear action flags visible

### When to Review Carefully
- ⚠️ Low confidence (<75%)
- ⚠️ Medium/High duplicate risk
- ⚠️ Detected action differs from claimed action
- ⚠️ Conflicting action flags

### When to Reject
- ❌ No relevant actions detected
- ❌ High duplicate risk
- ❌ Screenshot doesn't show LinkedIn activity
- ❌ Clearly fake or manipulated
- ❌ Wrong platform

### When to Adjust Points
Even if AI suggests certain points, admin can award different points if:
- User claimed higher action but did multiple lower actions
- Quality of engagement differs from standard
- Special circumstances noted in user notes

## API Endpoints

### For Users
- `POST /api/submit` - Submit proof, triggers AI
- `GET /api/submit/status?submission_id=X` - Poll for AI completion
- `GET /api/submissions` - View own submissions

### For Admins
- `GET /api/admin/pending` - Get all manual_review submissions
- `POST /api/admin/approve` - Approve and award points
- `POST /api/admin/reject` - Reject submission

## Database Fields

### Submissions Table
New AI fields stored:
```typescript
workflow_id: string          // AI workflow identifier
platform_detected: string    // "LinkedIn", etc.
like_detected: boolean
comment_detected: boolean
repost_detected: boolean
tag_detected: boolean
original_post_detected: boolean
primary_action: string       // Main action detected
assigned_points: number      // AI suggested points
action_confidence: number    // 0.0 to 1.0
duplicate_risk: string       // "LOW", "MEDIUM", "HIGH"
admin_notes: string         // AI recommendation + admin notes
```

## Benefits of This Workflow

### For Users
- ✅ Immediate submission confirmation
- ✅ Clear status updates
- ✅ Transparent process
- ✅ Fair human review

### For Admins
- ✅ AI does heavy lifting (analysis)
- ✅ All insights presented clearly
- ✅ Final human decision for quality
- ✅ Easy to spot issues/duplicates
- ✅ Expandable details when needed

### For the Company
- ✅ Quality control maintained
- ✅ Reduced fraudulent submissions
- ✅ Better data integrity
- ✅ Audit trail via workflow_id
- ✅ Scalable process

## Monitoring & Metrics

Track these metrics in admin panel:
- Average time from submission to approval
- AI vs Admin agreement rate
- Rejection rate by reason
- Duplicate detection accuracy
- Points distribution by action type

## Troubleshooting

### Submission stuck in "pending"
- Check server logs for AI API errors
- Verify workflow_id exists
- Check AI_VERIFICATION_API_KEY is valid
- May need to manually move to manual_review

### AI analysis missing/incomplete
- Workflow may have failed
- Check admin_notes for error messages
- Can still approve/reject manually based on image

### Points not updating after approval
- Check database triggers are enabled
- Verify monthly_points table updates
- Check user total_points field

## Future Enhancements

Potential improvements:
- [ ] Bulk approve/reject
- [ ] Admin comments on submissions
- [ ] User notifications on approval/rejection
- [ ] Analytics dashboard for AI performance
- [ ] Custom point amounts (not just presets)
- [ ] Submission search/filter
- [ ] Export submission data
- [ ] AI retraining based on admin corrections

## Access Control

### Admin Access
Currently: Email must be `ashish.deekonda@phinite.ai`

To add more admins:
```sql
INSERT INTO admins (user_id)
SELECT id FROM users WHERE email = 'new.admin@company.com';
```

### Security
- All endpoints require JWT authentication
- Admin endpoints check admin role
- Users can only see their own submissions
- Admins can see all submissions in manual_review

## Support

For issues or questions:
- Technical: Check server logs and workflow_id
- Process: Contact ashish.deekonda@phinite.ai
- Bug reports: Include submission_id and workflow_id
