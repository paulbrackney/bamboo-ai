# Ian AI Chat Application

A modern chat application built with React, TypeScript, Node.js, and OpenAI. Features a beautiful UI and real-time AI-powered conversations.

## Features

- 🤖 AI-powered chat using OpenAI GPT-3.5-turbo
- 💬 Beautiful, modern chat interface
- ⚡ Real-time message streaming
- 🔒 Secure API key management via environment variables
- 📱 Responsive design for all devices
- 🎨 Gradient-based modern UI

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup Instructions

### 1. Backend Setup

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Create a .env file
cp ../.env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=your_api_key_here
```

### 2. Frontend Setup

```bash
# From the root directory
cd ..

# Install frontend dependencies (if not already installed)
npm install
```

### 3. Running the Application

You need to run both the backend and frontend servers:

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`

## Environment Variables

Create a `.env` file in the `server` directory with:

```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

**Important:** Never commit your `.env` file to version control. It's already added to `.gitignore`.

## Project Structure

```
ian-the-goat/
├── server/              # Backend Node.js server
│   ├── server.js       # Express server with OpenAI integration
│   └── package.json    # Backend dependencies
├── src/                # Frontend React application
│   ├── App.tsx        # Main chat component
│   ├── App.css        # Chat UI styles
│   └── ...
└── package.json        # Frontend dependencies
```

## API Endpoints

- `POST /api/chat` - Send a message and get an AI response
- `GET /api/health` - Health check endpoint

## Technologies Used

**Frontend:**
- React 18
- TypeScript
- Vite
- CSS3

**Backend:**
- Node.js
- Express
- OpenAI API
- CORS
- dotenv

## Security Notes

- API keys are stored securely in environment variables
- Never expose your API key in client-side code
- The backend acts as a proxy between the frontend and OpenAI
- All API calls are made server-side

## Deployment

For production deployment:

1. Set environment variables on your hosting platform
2. Deploy the backend server (e.g., Heroku, Railway, Render)
3. Deploy the frontend to a static host (e.g., Vercel, Netlify)
4. Update the API endpoint in `src/App.tsx` to your production backend URL

## License

MIT
