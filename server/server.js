import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import { URL } from 'url';

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

// Log Cribl configuration at startup (but don't log the full URL/token for security)
console.log('[STARTUP] Cribl Configuration:', {
  enabled: CRIBL_CONFIG.enabled,
  urlSet: !!CRIBL_CONFIG.url,
  url: CRIBL_CONFIG.url ? CRIBL_CONFIG.url.substring(0, 50) + '...' : 'Not set',
  hasAuthToken: !!CRIBL_CONFIG.authToken,
  envCRIBL_URL: process.env.CRIBL_URL ? 'Set' : 'Not set',
  envCRIBL_ENABLED: process.env.CRIBL_ENABLED || 'undefined (defaults to enabled)'
});

// Function to send event to Cribl
async function sendToCribl(eventData) {
  console.log('[CRIBL] sendToCribl called');
  console.log('[CRIBL] Config:', {
    enabled: CRIBL_CONFIG.enabled,
    url: CRIBL_CONFIG.url ? 'Set' : 'Not set',
    hasAuthToken: !!CRIBL_CONFIG.authToken
  });

  if (!CRIBL_CONFIG.enabled || !CRIBL_CONFIG.url) {
    console.log('[CRIBL] Integration disabled or not configured');
    return;
  }

  try {
    const url = new URL(CRIBL_CONFIG.url);
    const requestBody = JSON.stringify(eventData);
    
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    };

    if (CRIBL_CONFIG.authToken) {
      headers['Authorization'] = `Bearer ${CRIBL_CONFIG.authToken}`;
    }

    console.log('[CRIBL] Sending event to:', CRIBL_CONFIG.url);
    console.log('[CRIBL] Event data:', JSON.stringify(eventData, null, 2));

    // Use https module instead of fetch to support custom ports
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: headers,
        timeout: 10000, // 10 second timeout
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            body: responseData,
            ok: res.statusCode >= 200 && res.statusCode < 300
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(requestBody);
      req.end();
    });

    console.log('[CRIBL] Response status:', response.status, response.statusText);
    console.log('[CRIBL] Response body:', response.body);

    if (!response.ok) {
      console.error('[CRIBL] Failed to send event:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: response.body,
        url: CRIBL_CONFIG.url
      });
    } else {
      console.log('[CRIBL] Event sent successfully');
    }
  } catch (error) {
    const errorInfo = {
      message: error.message,
      name: error.name,
      url: CRIBL_CONFIG.url
    };

    // Add more details for network errors
    if (error.code) errorInfo.code = error.code;
    if (error.cause) errorInfo.cause = error.cause;
    
    // Only log stack in development
    if (process.env.NODE_ENV !== 'production') {
      errorInfo.stack = error.stack;
    }

    console.error('[CRIBL] Error sending event:', errorInfo);

    // Helpful error messages
    if (error.message.includes('timeout')) {
      console.error('[CRIBL] Request timed out after 10 seconds. This might be a network issue in serverless environment.');
    } else if (error.message.includes('fetch failed') || error.message.includes('bad port') || error.code) {
      console.error('[CRIBL] Network error. This could indicate:');
      console.error('[CRIBL] - Network connectivity issues (common in serverless)');
      console.error('[CRIBL] - SSL/TLS certificate problems');
      console.error('[CRIBL] - Firewall blocking the connection');
      if (error.code) {
        console.error(`[CRIBL] Error code: ${error.code}`);
      }
    }
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
    console.log('[CHAT] Attempting to send event to Cribl...');
    sendToCribl(criblEvent).catch(err => 
      console.error('[CHAT] Cribl event promise rejected:', err)
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
    console.log('[CHAT] Attempting to send error event to Cribl...');
    sendToCribl(criblErrorEvent).catch(err => 
      console.error('[CHAT] Cribl error event promise rejected:', err)
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
