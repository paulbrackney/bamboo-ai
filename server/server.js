import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import https from 'https';
import http from 'http';
import { URL } from 'url';

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
  url: process.env.CRIBL_URL || 'http://default.main.focused-gilbert-141036e.cribl.cloud:20001',
  authToken: process.env.CRIBL_AUTH_TOKEN,
  enabled: process.env.CRIBL_ENABLED !== 'false'
};

console.log('[STARTUP] Cribl Configuration:', {
  enabled: CRIBL_CONFIG.enabled,
  urlSet: !!CRIBL_CONFIG.url,
  hasAuthToken: !!CRIBL_CONFIG.authToken
});

function createCriblEvent(type, payload) {
  return {
    _raw: payload._raw,
    timestamp: new Date().toISOString(),
    ...payload,
    host: process.env.HOSTNAME || 'bamboo-chat-app',
    source: 'chat-api',
    eventType: type,
    criblInstance: 'default.main.focused-gilbert-141036e.cribl.cloud'
  };
}

async function sendToCribl(eventData) {
  if (!CRIBL_CONFIG.enabled || !CRIBL_CONFIG.url) {
    return;
  }

  try {
    const url = new URL(CRIBL_CONFIG.url);
    const requestBody = JSON.stringify(eventData);
    const httpModule = url.protocol === 'https:' ? https : http;
    const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
    const path = (url.pathname || '/') + url.search;
    
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    };

    if (CRIBL_CONFIG.authToken) {
      headers['Authorization'] = `Bearer ${CRIBL_CONFIG.authToken}`;
    }

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: port,
        path: path,
        method: 'POST',
        headers: headers,
        timeout: 10000,
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          body: responseData,
          ok: res.statusCode >= 200 && res.statusCode < 300
        }));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout after 10 seconds'));
      });

      req.write(requestBody);
      req.end();
    });

    if (!response.ok) {
      console.error('[CRIBL] Failed to send event:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[CRIBL] Error:', error.message, error.code || '');
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

    // System prompt for Bamboo AI with goat jokes
    const systemPrompt = 
    `You are Bamboo AI, a helpful AI assistant from Bamboo HR. 
     You know a lot about Bamboo HR and can help with questions about it.
     You should reference the company name "Bamboo HR" in your responses when it's relevant to the conversation.
     You should also reference the company's mission and values in your responses when it's relevant to the conversation.
     You should also reference the company's products and services in your responses when it's relevant to the conversation.
     You should also reference the company's culture and values in your responses when it's relevant to the conversation.
     You should also reference the company's history and mission in your responses when it's relevant to the conversation.
     You should also reference the company's leadership and team in your responses when it's relevant to the conversation.
     You should also reference the company's customers and partners in your responses when it's relevant to the conversation.
     You should also reference the company's news and events in your responses when it's relevant to the conversation.
     You should also reference the company's blog and articles in your responses when it's relevant to the conversation.
     You should also reference the company's social media and website in your responses when it's relevant to the conversation.
     You should also reference the company's contact information in your responses when it's relevant to the conversation.`;

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
    });

    const response = completion.choices[0].message.content;
    const duration = Date.now() - startTime;

    sendToCribl(createCriblEvent('chat_request', {
      _raw: 'Chat request processed successfully',
      requestId,
      userMessage: message,
      aiResponse: response,
      conversationLength: conversationHistory.length,
      processingTimeMs: duration,
      model: 'gpt-4o-mini',
      status: 'success'
    })).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 50));
    res.json({ response });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    
    sendToCribl(createCriblEvent('chat_error', {
      _raw: `Chat request failed: ${error.message}`,
      requestId,
      userMessage: req.body.message || 'unknown',
      errorMessage: error.message,
      processingTimeMs: Date.now() - startTime,
      status: 'error'
    })).catch(() => {});
    
    await new Promise(resolve => setTimeout(resolve, 50));
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

app.post('/api/test-cribl', async (req, res) => {
  const testEvent = {
    _raw: 'Test event from deployment',
    timestamp: new Date().toISOString(),
    source: 'test-endpoint',
    host: process.env.HOSTNAME || 'test',
    status: 'test'
  };

  try {
    await sendToCribl(testEvent);
    res.json({ 
      success: true, 
      message: 'Test event sent to Cribl',
      config: { enabled: CRIBL_CONFIG.enabled, urlSet: !!CRIBL_CONFIG.url }
    });
  } catch (error) {
    console.error('[TEST-CRIBL] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      config: { enabled: CRIBL_CONFIG.enabled, urlSet: !!CRIBL_CONFIG.url }
    });
  }
});

// Export the app for Vercel
export default app;

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
