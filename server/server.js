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
  url: process.env.CRIBL_URL || 'https://default.main.focused-gilbert-141036e.cribl.cloud/cribl/_bulk',
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
        timeout: 5000, // 5 second timeout (reduced - if it times out, Vercel likely blocks port 10080)
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
        reject(new Error(`Request timeout after 30 seconds. This may indicate network issues from Vercel to ${url.hostname}:${url.port || 443}`));
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
      console.error('[CRIBL] Request timed out after 30 seconds. Possible issues:');
      console.error('[CRIBL] - Network latency from Vercel to Cribl endpoint');
      console.error('[CRIBL] - Port 10080 might be blocked or filtered by Vercel');
      console.error('[CRIBL] - Cribl endpoint may be slow or unresponsive');
      console.error('[CRIBL] - Consider checking Cribl source configuration');
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

    // Send response to user immediately (don't wait for Cribl)
    res.json({ response });
    
    // Send to Cribl asynchronously (fire-and-forget for serverless)
    // Note: If this times out, Vercel may be blocking port 10080
    // Consider using a port 443 endpoint or a queue service
    console.log('[CHAT] Sending event to Cribl asynchronously...');
    sendToCribl(criblEvent).catch(err => {
      // Log error but don't block - events may still be sent despite timeout
      if (err.message.includes('timeout')) {
        console.warn('[CHAT] Cribl request timed out. This may indicate Vercel is blocking port 10080.');
        console.warn('[CHAT] Event may have been sent before timeout, check Cribl dashboard.');
      } else {
        console.error('[CHAT] Cribl event error:', err.message);
      }
    });
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

    // Send error response immediately
    res.status(500).json({ 
      error: 'Failed to get response from OpenAI',
      details: error.message 
    });

    // Send error to Cribl asynchronously (fire-and-forget)
    console.log('[CHAT] Sending error event to Cribl asynchronously...');
    sendToCribl(criblErrorEvent).catch(err => {
      if (err.message.includes('timeout')) {
        console.warn('[CHAT] Cribl error event timed out. Vercel may be blocking port 10080.');
      } else {
        console.error('[CHAT] Cribl error event error:', err.message);
      }
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
