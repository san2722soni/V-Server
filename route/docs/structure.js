// route/docs/structure.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function docsRoutes(fastify) {
  // GET /api/docs/structure - Returns complete API structure
  fastify.get('/structure', async (request, reply) => {
    try {
      const dataPath = path.join(__dirname, '../../lib/backend-data.js');
      
      // Check if file exists
      if (!fs.existsSync(dataPath)) {
        return reply.code(404).send({
          error: 'API structure not generated yet',
          message: 'Run "npm run parse-api" to generate the API structure'
        });
      }

      // Read the file content
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      
      // Extract the JSON data using regex (since it's exported as ES module)
      const jsonMatch = fileContent.match(/export const backendData = ({[\s\S]*});/);
      
      if (!jsonMatch) {
        return reply.code(500).send({
          error: 'Failed to parse API structure',
          message: 'Generated file format is invalid'
        });
      }

      // Parse the JSON
      const backendData = JSON.parse(jsonMatch[1]);

      // Return the complete structure matching your frontend expectations
      return reply.send({
        services: backendData.services,
        endpoints: backendData.endpoints,
        edges: backendData.edges
      });
    } catch (error) {
      fastify.log.error('Error loading API structure:', error);
      return reply.code(500).send({
        error: 'Failed to load API structure',
        message: error.message
      });
    }
  });

  // GET /api/docs/services - Returns only services
  fastify.get('/services', async (request, reply) => {
    try {
      const dataPath = path.join(__dirname, '../../lib/backend-data.js');
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const jsonMatch = fileContent.match(/export const backendData = ({[\s\S]*});/);
      const backendData = JSON.parse(jsonMatch[1]);
      
      return reply.send({
        services: backendData.services,
        count: backendData.services.length
      });
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/docs/endpoints - Returns only endpoints
  fastify.get('/endpoints', async (request, reply) => {
    try {
      const dataPath = path.join(__dirname, '../../lib/backend-data.js');
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const jsonMatch = fileContent.match(/export const backendData = ({[\s\S]*});/);
      const backendData = JSON.parse(jsonMatch[1]);
      
      return reply.send({
        endpoints: backendData.endpoints,
        count: backendData.endpoints.length
      });
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/docs/search?q=matchmaking - Search endpoints
  fastify.get('/search', async (request, reply) => {
    try {
      const { q } = request.query;
      
      if (!q) {
        return reply.code(400).send({ error: 'Query parameter "q" is required' });
      }

      const dataPath = path.join(__dirname, '../../lib/backend-data.js');
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const jsonMatch = fileContent.match(/export const backendData = ({[\s\S]*});/);
      const backendData = JSON.parse(jsonMatch[1]);
      
      const query = q.toLowerCase();
      const results = backendData.endpoints.filter(endpoint => 
        endpoint.title.toLowerCase().includes(query) ||
        endpoint.description.toLowerCase().includes(query) ||
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.category.toLowerCase().includes(query)
      );

      return reply.send({
        query: q,
        results,
        count: results.length
      });
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // GET /api/docs/stats - Get API statistics
  fastify.get('/stats', async (request, reply) => {
    try {
      const dataPath = path.join(__dirname, '../../lib/backend-data.js');
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const jsonMatch = fileContent.match(/export const backendData = ({[\s\S]*});/);
      const backendData = JSON.parse(jsonMatch[1]);
      
      const stats = {
        services: backendData.services.length,
        endpoints: backendData.endpoints.length,
        edges: backendData.edges.length,
        byMethod: {},
        byCategory: {},
        requiresAuth: 0,
        public: 0
      };

      // Count by method
      backendData.endpoints.forEach(endpoint => {
        if (endpoint.method) {
          stats.byMethod[endpoint.method] = (stats.byMethod[endpoint.method] || 0) + 1;
        }
        
        if (endpoint.category) {
          stats.byCategory[endpoint.category] = (stats.byCategory[endpoint.category] || 0) + 1;
        }

        if (endpoint.requiresAuth) {
          stats.requiresAuth++;
        } else {
          stats.public++;
        }
      });

      return reply.send(stats);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });
}