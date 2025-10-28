import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cribl configuration
const CRIBL_CONFIG = {
  url: process.env.CRIBL_URL || 'https://default.main.focused-gilbert-141036e.cribl.cloud:10080/cribl/_bulk',
  authToken: process.env.CRIBL_AUTH_TOKEN,
  enabled: process.env.CRIBL_ENABLED !== 'false' // Default to enabled
};

// Function to send event to Cribl
async function sendToCribl(eventData) {
  if (!CRIBL_CONFIG.enabled || !CRIBL_CONFIG.url) {
    console.log('Cribl integration disabled or not configured');
    return;
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (CRIBL_CONFIG.authToken) {
      headers['Authorization'] = `Bearer ${CRIBL_CONFIG.authToken}`;
    }

    const response = await fetch(CRIBL_CONFIG.url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      console.error('Failed to send event to Cribl:', response.status, response.statusText);
    } else {
      console.log('Event sent to Cribl successfully');
    }
  } catch (error) {
    console.error('Error sending event to Cribl:', error.message);
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // System prompt for Ian the Criblanian with goat jokes
    const systemPrompt = 
    `You are Ian the Criblanian, a helpful AI assistant from Cribl. 
     You love telling goat jokes and have a different one for every response. 
     Keep your responses conversational, helpful, and always end with a unique goat joke. 
     Make sure each goat joke is different from previous ones.`;

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: messages,
    });

    const response = completion.choices[0].message.content;
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Send success event to Cribl
    const criblEvent = {
      _raw: `Chat request processed successfully - Ian the Criblanian responded with a goat joke`,
      timestamp: new Date().toISOString(),
      requestId: requestId,
      host: process.env.HOSTNAME || 'ian-chat-app',
      source: 'chat-api',
      eventType: 'chat_request',
      userMessage: message,
      aiResponse: response,
      conversationLength: conversationHistory.length,
      processingTimeMs: duration,
      model: 'gpt-5-nano',
      status: 'success',
      criblInstance: 'default.main.focused-gilbert-141036e.cribl.cloud'
    };

    // Send to Cribl asynchronously (don't wait for response)
    sendToCribl(criblEvent).catch(err => 
      console.error('Cribl event failed:', err.message)
    );

    res.json({ response });
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('Error calling OpenAI:', error);

    // Send error event to Cribl
    const criblErrorEvent = {
      _raw: `Chat request failed: ${error.message}`,
      timestamp: new Date().toISOString(),
      requestId: requestId,
      host: process.env.HOSTNAME || 'ian-chat-app',
      source: 'chat-api',
      eventType: 'chat_error',
      userMessage: req.body.message || 'unknown',
      errorMessage: error.message,
      processingTimeMs: duration,
      status: 'error',
      criblInstance: 'default.main.focused-gilbert-141036e.cribl.cloud'
    };

    // Send error to Cribl asynchronously
    sendToCribl(criblErrorEvent).catch(err => 
      console.error('Cribl error event failed:', err.message)
    );

    res.status(500).json({ 
      error: 'Failed to get response from OpenAI',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export the app for Vercel
export default app;

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
