# Sketch AI - Deployment Guide

## Problem Fixed
Your app had **CORS errors** and **401 (Unauthorized) errors** because:
1. Direct frontend API calls violate CORS policies
2. API keys were exposed in client-side code (security risk)
3. Different API services were rejecting requests

## Solution
Created a **backend proxy** (`/api/generate.js`) that:
- ✅ Handles all API requests securely on the server
- ✅ Keeps API keys private in environment variables
- ✅ Bypasses CORS restrictions
- ✅ Manages retries and fallbacks
- ✅ Works with Vercel's serverless functions

---

## Deployment Steps (Vercel)

### 1. Create Vercel Account
- Go to [vercel.com](https://vercel.com)
- Click "Continue with GitHub"
- Authorize Vercel to access your repositories

### 2. Import Project
- Click "Add New" → "Project"
- Select `edame3000/sketch-ai`
- Leave default settings
- Click "Deploy"

### 3. Set Environment Variables
After deployment, go to your Vercel dashboard:
1. Select your project
2. Go to **Settings** → **Environment Variables**
3. Add these three variables:

```
TOGETHER_API_KEY = [your key]
DEEPAI_API_KEY = [your key]
REPLICATE_API_TOKEN = [your token]
```

**How to get API keys:**

#### Together AI
- Visit: https://api.together.xyz/
- Sign up and go to API page
- Copy your API key

#### Deep AI
- Visit: https://deepai.org/dashboard
- Get your Free API Key
- Copy it

#### Replicate
- Visit: https://replicate.com/account/api-tokens
- Create new token
- Copy it

### 4. Redeploy with Environment Variables
- After adding env vars, Vercel automatically redeploys
- Your app is now live at `https://your-project.vercel.app`

---

## Local Testing

### 1. Install Dependencies
```bash
npm install vercel -g
```

### 2. Create `.env.local`
```bash
cp .env.example .env.local
# Edit .env.local and add your real API keys
```

### 3. Run Vercel Dev Server
```bash
vercel dev
```

Your app runs at `http://localhost:3000`

---

## File Structure
```
sketch-ai/
├── index.html          (Updated to use backend proxy)
├── sw.js               (Service Worker - unchanged)
├── api/
│   └── generate.js     (NEW - Backend proxy function)
├── .env.example        (NEW - Template for env vars)
└── vercel.json         (OPTIONAL - For config)
```

---

## How It Works

### Before (Direct API Calls) ❌
```
Frontend Browser → Direct API Call → Server
                   ↓ CORS Error or 401 Unauthorized
```

### After (Backend Proxy) ✅
```
Frontend Browser → Your Backend (/api/generate)
                                  ↓
                   Secure API Call with secret key
                                  ↓
                   Together/Deep AI/Replicate
                                  ↓
                   Return image URL to frontend
```

---

## Troubleshooting

### "API request failed"
- Check that environment variables are set in Vercel
- Verify API keys are correct in the dashboard

### "401 Unauthorized"
- Double-check API key spelling in .env.local
- Make sure it's the correct key for that service

### "CORS error"
- If error persists, your backend deployment may have failed
- Check Vercel build logs in dashboard

### "Function timeout"
- Replicate might need longer than Vercel's default 10s
- This is handled by the code (30 attempts × 2s = 60s max)

---

## Security Benefits
- ✅ API keys never exposed in browser console
- ✅ Users can't abuse your API keys directly
- ✅ Rate limiting can be added to backend
- ✅ Requests are logged server-side

---

## Next Steps
1. Add your 3 API keys to Vercel environment variables
2. Redeploy
3. Test at your Vercel URL
4. Share the link!

Need help? Check the Vercel docs: https://vercel.com/docs
