# Vercel Deployment Guide for Ian the Goat Backend

## Prerequisites
1. Vercel account
2. OpenAI API key
3. Git repository with your code

## Deployment Steps

### 1. Environment Variables
In your Vercel dashboard, add these environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Set to `production`

### 2. Deploy from Git
1. Connect your GitHub repository to Vercel
2. Set the **Root Directory** to `server` (since your backend is in the server folder)
3. Deploy

### 3. Alternative: Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to server directory
cd server

# Deploy
vercel

# Follow the prompts to link to your project
```

## Configuration Files

### vercel.json
The `vercel.json` file configures:
- Build settings for Node.js
- Route handling
- Environment variables

### server.js
- Exports the Express app for Vercel
- Only starts listening in development mode
- Uses `process.env.PORT` (Vercel provides this automatically)

## API Endpoints
Once deployed, your API will be available at:
- `https://your-project.vercel.app/api/health` - Health check
- `https://your-project.vercel.app/api/chat` - Chat endpoint

## Troubleshooting

### Common Issues:
1. **Port already in use**: Fixed by using Vercel's automatic port assignment
2. **Environment variables**: Make sure to set them in Vercel dashboard
3. **Build errors**: Check that all dependencies are in package.json
4. **CORS issues**: The server includes CORS middleware

### Testing Locally:
```bash
cd server
npm start
# Server runs on http://localhost:3001
```

### Testing Production:
```bash
curl https://your-project.vercel.app/api/health
curl -X POST https://your-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Ian!"}'
```

## Frontend Configuration
Update your frontend to use the Vercel URL instead of localhost:
```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-project.vercel.app' 
  : 'http://localhost:3001';
```
