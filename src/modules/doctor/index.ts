// Expose the Service for direct backend integration by other modules
// This allows other developers (Patient, AI Assistant, Specialized) to call Doctor functions directly

export { doctorService } from './service.js';
export { default as doctorRoutes } from './routes.js';
export * from './types.js';
