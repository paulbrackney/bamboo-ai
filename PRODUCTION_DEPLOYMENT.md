# 🚀 Production Deployment Guide for Ian the Goat

## Overview
This guide will help you deploy both your **backend** (Node.js/Express) and **frontend** (React/Vite) to production using Vercel.

## 📋 Prerequisites
- [ ] Vercel account (free at vercel.com)
- [ ] OpenAI API key with credits
- [ ] GitHub repository with your code
- [ ] Git installed locally

---

## 🎯 Step 1: Deploy the Backend

### 1.1 Create Vercel Project for Backend
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. **IMPORTANT**: Set the **Root Directory** to `server`
5. Click "Deploy"

### 1.2 Set Environment Variables
In your Vercel project dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add these variables:
   ```
   OPENAI_API_KEY = sk-proj-your-actual-api-key-here
   NODE_ENV = production
   ```
3. Click "Save"

### 1.3 Get Your Backend URL
After deployment, Vercel will give you a URL like:
```
https://your-project-name.vercel.app
```
**Save this URL** - you'll need it for the frontend!

---

## 🎯 Step 2: Deploy the Frontend

### 2.1 Create Vercel Project for Frontend
1. Create a **new** Vercel project
2. Import the same GitHub repository
3. **IMPORTANT**: Set the **Root Directory** to `.` (root directory)
4. Click "Deploy"

### 2.2 Set Frontend Environment Variables
In your frontend Vercel project:
1. Go to **Settings** → **Environment Variables**
2. Add this variable:
   ```
   VITE_API_URL = https://your-backend-project.vercel.app
   ```
   (Use the backend URL from Step 1.3)
3. Click "Save"

### 2.3 Redeploy Frontend
After adding the environment variable:
1. Go to **Deployments** tab
2. Click the "..." menu on your latest deployment
3. Click "Redeploy"

---

## 🧪 Step 3: Test Your Production Deployment

### 3.1 Test Backend
```bash
# Test health endpoint
curl https://your-backend-project.vercel.app/api/health

# Test chat endpoint
curl -X POST https://your-backend-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Ian!"}'
```

### 3.2 Test Frontend
1. Visit your frontend URL
2. Try sending a message
3. You should get a response from Ian with a goat joke!

---

## 🔧 Step 4: Local Development Setup

### 4.1 Backend Development
```bash
cd server
npm install
npm start
# Server runs on http://localhost:3001
```

### 4.2 Frontend Development
```bash
# In project root
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 4.3 Environment Variables for Local Development
Create `.env` file in project root:
```bash
# For local development, leave empty to use localhost:3001
VITE_API_URL=
```

---

## 🚨 Common Issues & Solutions

### Issue: "Model not found" error
**Solution**: Make sure you're using `gpt-4o-mini` (not `gpt-5-nano`)

### Issue: Frontend can't connect to backend
**Solution**: 
1. Check that `VITE_API_URL` is set correctly
2. Make sure backend is deployed and accessible
3. Redeploy frontend after changing environment variables

### Issue: CORS errors
**Solution**: The backend already includes CORS middleware, so this shouldn't happen

### Issue: Backend deployment fails
**Solution**:
1. Make sure Root Directory is set to `server`
2. Check that all dependencies are in `package.json`
3. Verify environment variables are set

---

## 📁 Project Structure
```
ian-the-goat/
├── server/                 # Backend (deploy to Vercel)
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   ├── vercel.json        # Vercel configuration
│   └── .env               # Local environment variables
├── src/                   # Frontend (deploy to Vercel)
│   ├── App.tsx            # Main React component
│   └── ...
├── package.json           # Frontend dependencies
└── .env                   # Frontend environment variables
```

---

## 🎉 You're Done!

After following these steps:
- ✅ Backend deployed and accessible via API
- ✅ Frontend deployed and connected to backend
- ✅ Ian the Criblanian ready to tell goat jokes in production!

## 🔗 Quick Links
- [Vercel Dashboard](https://vercel.com/dashboard)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Vercel Documentation](https://vercel.com/docs)
