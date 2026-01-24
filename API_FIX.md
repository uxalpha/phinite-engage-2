# API Payload Fix Applied ✅

## Change Made

Fixed the AI verification API payload to use the correct field name:

### Before:
```json
{
  "image_url": "https://..."
}
```

### After (Correct):
```json
{
  "proof_image": "https://..."
}
```

## File Updated

- `app/api/submit/route.ts` (line 77)

## AI API Integration Details

**Endpoint:**
```
https://ai-core-dev.phinite.ai/trigger/QZ-3DDP/16qObTjWO/development
```

**Request:**
```javascript
POST /trigger/QZ-3DDP/16qObTjWO/development
Headers:
  Authorization: Bearer {YOUR_API_KEY}
  Content-Type: application/json
Body:
  {
    "proof_image": "https://xxxxx.supabase.co/storage/v1/object/public/proof-images/..."
  }
```

**Response:**
```json
{
  "workflow_id": "...",
  "proof_image": "...",
  "platform_detected": "LinkedIn",
  "like_detected": true/false,
  "comment_detected": true/false,
  "repost_detected": true/false,
  "tag_detected": true/false,
  "original_post_detected": true/false,
  "primary_action": "...",
  "assigned_points": 25,
  "action_confidence": 0.95,
  "duplicate_risk": "LOW/MEDIUM/HIGH",
  ...
}
```

## Status

✅ **Fixed and ready to use!**

The application will now send the correct payload format to your AI verification API.
