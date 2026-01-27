# Fix for Pending Submissions Not Showing

## Problem Solved

Admin's submissions (and any user's submissions) were stuck in "pending" status because the status polling was removed from the frontend. Submissions with workflow_ids weren't being checked and updated to "manual_review" status.

## Solution

Added a **"Check Pending Status"** button in the Admin Panel that:
1. Finds all submissions in "pending" status with workflow_ids
2. Checks their AI verification status
3. Updates them to "manual_review" with AI insights
4. Makes them visible in the admin review queue

## How to Use

### Step 1: Go to Admin Panel
Navigate to `/admin` or click "Admin" in the navigation.

### Step 2: Click "🔄 Check Pending Status"
- Located in the top-right of the page
- Button turns blue with "⏳ Checking..." while processing
- Takes a few seconds to check all pending submissions

### Step 3: View Results
After checking, you'll see a green success box showing:
- ✅ Status Check Complete
- Number of submissions checked
- Number of submissions updated
- Detailed results (expand to see each submission)

### Step 4: Review Submissions
- Updated submissions now appear in the "Pending Manual Review" section
- Your own submissions are highlighted with blue border
- All AI insights are available
- Approve or reject as needed

## When to Use This Button

Click **🔄 Check Pending Status** when:
- ✅ You submitted a proof 3+ minutes ago but don't see it in the review queue
- ✅ Debug Info shows submissions in "pending" status with workflow_ids
- ✅ After multiple users submit proofs and they're not appearing
- ✅ As a routine check (e.g., once every hour or after seeing new submissions)

## What It Does

The button triggers `/api/admin/check-pending` which:

1. **Finds Pending Submissions**
   - Queries database for `status = 'pending'`
   - Filters for submissions with `workflow_id` (AI workflow started)

2. **Checks AI Status**
   - Calls AI status API for each workflow_id
   - Gets the verification results

3. **Updates Submissions**
   - If AI completed: Updates to `manual_review` with all AI insights
   - If AI still processing: Leaves as `pending` (check again later)
   - If AI errored: Updates to `manual_review` with error note

4. **Returns Results**
   - Shows how many were checked and updated
   - Details for each submission

## Example Results

```json
{
  "message": "Checked 3 submissions, updated 3",
  "checked": 3,
  "updated": 3,
  "results": [
    {
      "id": "abc-123",
      "status": "updated",
      "message": "Moved to manual_review"
    },
    {
      "id": "def-456",
      "status": "updated",
      "message": "Moved to manual_review"
    },
    {
      "id": "ghi-789",
      "status": "still_pending",
      "message": "AI still processing"
    }
  ]
}
```

## Automatic vs Manual

### What's Automatic:
- Submission creation (instant)
- AI workflow starts (instant)
- AI analysis runs (~3 minutes, background)

### What's Manual (requires button click):
- Checking AI status
- Updating submission status to manual_review
- Moving submissions to admin review queue

**Why manual?** 
- Removed frontend polling for better UX
- No automatic background jobs set up yet
- Admin can control when to process submissions

## Future Enhancement: Auto-Check

To make this fully automatic, you could:

1. **Add a cron job** (if using Vercel):
   ```javascript
   // api/cron/check-pending.ts
   export default async function handler() {
     // Check pending submissions every 5 minutes
   }
   ```

2. **Use a background worker** (Inngest, BullMQ, etc.):
   - Runs every X minutes
   - Checks pending submissions automatically

3. **Keep frontend polling** (removed for UX reasons):
   - User's browser checks status
   - Updates submission when ready

For now, the manual button is quick and gives admins control!

## Troubleshooting

### Button says "Checked 0, Updated 0"
- **No pending submissions with workflow_ids**
- Either all submissions already processed, or submissions don't have workflow_ids
- Check Debug Info to see actual statuses

### Button says "Error: AI_VERIFICATION_API_KEY is not set"
- Environment variable missing
- Check `.env.local` has `AI_VERIFICATION_API_KEY`

### Some submissions show "still_pending"
- **AI hasn't finished processing yet**
- Wait another minute or two
- Click the button again

### Some submissions show "error"
- **AI API returned error or non-200 status**
- Check server logs for details
- May need to manually review these

### Submissions update but still don't show
- **Might be different status than manual_review**
- Use Debug Info to check actual status
- May have been moved to "verified" or "rejected" by AI decision logic

## Files Modified

1. ✅ `/app/api/admin/check-pending/route.ts` - New endpoint (POST)
2. ✅ `/app/admin/page.tsx` - Added button and result display
3. ✅ `FIX_PENDING_SUBMISSIONS.md` - This guide

## Summary

**Problem**: Submissions stuck in "pending" status, not visible in admin panel

**Solution**: Click **🔄 Check Pending Status** button to manually trigger status checks

**Result**: Submissions move to "manual_review" and appear in admin queue with AI insights

**When**: After submissions (~3-5 min after submit), or when Debug Info shows pending submissions

---

Now your submissions will show up in the admin panel! 🎉
