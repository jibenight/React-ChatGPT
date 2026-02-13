const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'React-ChatGPT API',
      version: '1.0.0',
      description: 'API multi-provider AI chatbot (OpenAI, Gemini, Claude, Mistral, Groq)',
    },
    servers: [{ url: '/', description: 'API server' }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            instructions: { type: 'string' },
            context_data: { type: 'string' },
            user_id: { type: 'integer' },
          },
        },
        Thread: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            project_id: { type: 'integer' },
            user_id: { type: 'integer' },
            last_message_at: { type: 'string' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            thread_id: { type: 'string' },
            role: { type: 'string', enum: ['user', 'assistant', 'system'] },
            content: { type: 'string' },
            provider: { type: 'string' },
            model: { type: 'string' },
            attachments: { type: 'string', nullable: true },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ['./routes/*.ts'],
};

module.exports = swaggerJsdoc(options);
