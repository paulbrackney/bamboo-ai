# 🔧 Environment Variables Explained

## Backend Environment Variables (Vercel)

### Required Variables:
```
OPENAI_API_KEY = sk-proj-your-actual-openai-key-here
NODE_ENV = production
```

**Where to set them:**
1. Go to your Vercel backend project dashboard
2. Settings → Environment Variables
3. Add each variable
4. Click "Save"

**What they do:**
- `OPENAI_API_KEY`: Allows your backend to call OpenAI's API
- `NODE_ENV`: Tells the server it's running in production mode

## Frontend Environment Variables (Vercel)

### Required Variables:
```
VITE_API_URL = https://your-backend-project.vercel.app
```

**Where to set them:**
1. Go to your Vercel frontend project dashboard
2. Settings → Environment Variables
3. Add the variable
4. Click "Save"
5. **Important**: Redeploy your frontend after adding environment variables

**What it does:**
- Tells your frontend where to find the backend API
- If not set, defaults to `http://localhost:3001` (for local development)

## Local Development Environment Variables

### Backend (.env in /server folder):
```
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
PORT=3001
```

### Frontend (.env in project root):
```
VITE_API_URL=
```
(Leave empty to use localhost:3001)

## 🔍 How to Check if Environment Variables are Working

### Backend:
```bash
# Test locally
cd server
node -e "require('dotenv').config(); console.log('API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set')"

# Test in production
curl https://your-backend.vercel.app/api/health
```

### Frontend:
```bash
# Check in browser console
console.log(import.meta.env.VITE_API_URL)
```

## ⚠️ Important Notes

1. **Never commit API keys to Git** - they're already in .gitignore
2. **Environment variables are case-sensitive**
3. **Frontend variables must start with VITE_** to be accessible in the browser
4. **Redeploy frontend after changing environment variables**
5. **Backend variables take effect immediately**
