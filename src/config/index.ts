import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  TMA_URL: process.env.TMA_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.TenaSync_Groq_API_KEY || '',
};
