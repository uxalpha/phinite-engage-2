# Employee Brand Engagement Platform

A gamified web application for employees to earn points by engaging with company posts on LinkedIn. Users submit proof screenshots, AI verifies the activity, and points are awarded automatically.

## Features

✅ **User Authentication** - Email/password registration and login  
✅ **Proof Submission** - Upload LinkedIn activity screenshots  
✅ **AI Verification** - Automatic verification using AI API (confidence >= 0.8)  
✅ **Manual Review** - Admin can review low-confidence submissions  
✅ **Point System** - Different points for different activities  
✅ **Monthly Leaderboard** - Rankings reset on 1st of each month  
✅ **Admin Panel** - Manual approval/rejection of submissions  
✅ **Mobile-Friendly** - Responsive black & white design  

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **AI Verification**: Custom AI API

## Point System

| Activity | Points |
|----------|--------|
| Like | 5 |
| Comment | 10 |
| Repost | 15 |
| Tag a Teammate | 20 |
| Original Post | 25 |

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd webapp
npm install
```

### 2. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema from `schema.sql` in Supabase SQL Editor
3. Create storage bucket named `proof-images` (make it public)
4. Follow instructions in `STORAGE_SETUP.md` for storage policies

### 3. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Verification API
AI_VERIFICATION_API_URL=https://ai-core-dev.phinite.ai/trigger/QZ-3DDP/16qObTjWO/development
AI_VERIFICATION_API_KEY=your_api_key

# JWT Secret (generate a random string)
JWT_SECRET=your_random_secret_key

# Admin Email
ADMIN_EMAIL=ashish.deekonda@phinite.ai
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
webapp/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── submit/       # Submission endpoint
│   │   ├── submissions/  # Get user submissions
│   │   ├── leaderboard/  # Leaderboard data
│   │   └── admin/        # Admin endpoints
│   ├── auth/             # Login/register page
│   ├── dashboard/        # Main dashboard
│   ├── leaderboard/      # Leaderboard page
│   ├── admin/            # Admin panel
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Homepage (redirects)
│   └── globals.css       # Global styles
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── types.ts          # TypeScript types
│   ├── utils.ts          # Utility functions
│   └── middleware.ts     # Auth middleware
├── schema.sql            # Database schema
├── STORAGE_SETUP.md      # Storage setup guide
└── README.md             # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Submissions
- `POST /api/submit` - Submit proof (requires auth)
- `GET /api/submissions` - Get user submissions (requires auth)

### Leaderboard
- `GET /api/leaderboard` - Get monthly leaderboard
- `GET /api/leaderboard?month=2026-01` - Get specific month

### Admin (requires admin auth)
- `GET /api/admin/pending` - Get submissions pending review
- `POST /api/admin/approve` - Approve submission
- `POST /api/admin/reject` - Reject submission

## AI Verification Logic

1. User uploads screenshot
2. Image uploaded to Supabase Storage
3. Public URL sent to AI API as `{ "proof_image": "https://..." }`
4. AI returns confidence score and detected actions
5. Auto-verification rules:
   - `confidence >= 0.8` → Verified
   - `confidence < 0.8` → Manual review
   - `platform != "LinkedIn"` → Rejected
   - `duplicate_risk = "HIGH"` → Rejected

## Admin Access

Admin email: `ashish.deekonda@phinite.ai`

First user with this email gets admin privileges automatically.

## Monthly Reset

Leaderboard resets on the 1st of each month. Historical data is preserved in `monthly_points` table.

## Database Schema

- `users` - User accounts
- `submissions` - Proof submissions with AI verification results
- `monthly_points` - Historical monthly points
- `admins` - Admin user IDs

## Development Notes

- Mobile-first responsive design
- Black & white color scheme
- No external color usage
- TypeScript strict mode
- Form validation on client and server
- JWT token authentication
- Automatic point calculation
- Trigger-based point updates

## Deployment

Deploy to any Next.js hosting platform:
- Vercel (recommended)
- Netlify
- Railway
- AWS Amplify

## License

MIT

## Support

For issues, contact: ashish.deekonda@phinite.ai
