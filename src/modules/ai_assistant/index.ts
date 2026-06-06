// Expose the Service for direct backend integration by other modules
// This allows other developers (Doctor, Patient, Specialized) to call AI functions directly
// without needing to make HTTP requests to the /api/ai endpoints.

export { AIAssistantService, SymptomAnalysisResult } from './service.js';
export { default as aiRoutes } from './routes.js';
