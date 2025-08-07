const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3456;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration N8N
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.harmonytech.be';
const N8N_API_KEY = process.env.N8N_API_KEY;

console.log('Starting MCP N8N Server...');
console.log('N8N Base URL:', N8N_BASE_URL);
console.log('N8N API Key configured:', !!N8N_API_KEY);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MCP N8N Server is running',
    version: '0.1.0',
    n8n_url: N8N_BASE_URL,
    api_key_configured: !!N8N_API_KEY
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MCP N8N Workflow Builder Server',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      workflows: '/api/workflows',
      mcp: '/mcp'
    }
  });
});

// Test N8N connection
app.get('/api/test', async (req, res) => {
  try {
    if (!N8N_API_KEY) {
      return res.status(400).json({ error: 'N8N API key not configured' });
    }

    const response = await axios.get(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    res.json({
      status: 'success',
      message: 'N8N connection successful',
      workflows_count: response.data.data ? response.data.data.length : 0
    });
  } catch (error) {
    console.error('N8N connection error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to N8N',
      error: error.message
    });
  }
});

// List workflows endpoint
app.get('/api/workflows', async (req, res) => {
  try {
    if (!N8N_API_KEY) {
      return res.status(400).json({ error: 'N8N API key not configured' });
    }

    const response = await axios.get(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching workflows:', error.message);
    res.status(500).json({
      error: 'Failed to fetch workflows',
      message: error.message
    });
  }
});

// Simple MCP endpoint for testing
app.post('/mcp', (req, res) => {
  console.log('MCP Request received:', JSON.stringify(req.body, null, 2));
  
  const { method, params } = req.body;

  // Simple response for list_tools
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        tools: [
          {
            name: 'list_workflows',
            description: 'List all N8N workflows',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'test_connection',
            description: 'Test N8N connection',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      },
      id: req.body.id
    });
  }

  // Handle tool calls
  if (method === 'tools/call') {
    const { name } = params;
    
    if (name === 'test_connection') {
      return res.json({
        jsonrpc: '2.0',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'connected',
              n8n_url: N8N_BASE_URL,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        },
        id: req.body.id
      });
    }
  }

  // Default response
  res.json({
    jsonrpc: '2.0',
    error: {
      code: -32601,
      message: `Method '${method}' not found`
    },
    id: req.body.id
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 MCP N8N Server running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`🔗 N8N URL: ${N8N_BASE_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});