import { callLLM, callLLMMultimodal } from '../../core/ai/engine.js';
import { prisma } from '../../core/db/index.js';

export interface SymptomAnalysisResult {
  condition: string;
  isEmergency: boolean;
  followUpQuestions: string[];
  recommendation: string;
}

export class AIAssistantService {
  /**
   * Analyze symptoms, give actionable home-care advice, and return follow-up questions
   */
  static async analyzeSymptoms(symptoms: string): Promise<SymptomAnalysisResult> {
    const prompt = `You are an AI Medical Assistant for TenaSync in Ethiopia. 
Analyze the following patient consultation log / symptoms: 
"${symptoms}"

IMPORTANT RULES:
1. Do NOT ask endless questions. If you have a general idea of the condition, conclude immediately.
2. If you must ask a follow-up, ask ONLY ONE critical question. If you have enough info, return an empty array [] for followUpQuestions.
3. In the "recommendation" field, provide highly actionable home-care advice (e.g., specific medications they can take like Paracetamol/Ibuprofen, traditional Ethiopian remedies, rest, fluids) and specify what type of doctor they should see.
4. If it is a life-threatening emergency, set "isEmergency" to true.

Provide a JSON response with the EXACT following format:
{
  "condition": "Likely disease or condition",
  "isEmergency": false,
  "followUpQuestions": ["Only 1 question if absolutely needed, else empty"],
  "recommendation": "Specific medications, home remedies, and doctor recommendation"
}

Reply ONLY with valid JSON.`;

    try {
      const resultStr = await callLLM(prompt);
      
      // Extract JSON using regex to avoid extra text from LLM
      const match = resultStr.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('LLM did not return a valid JSON object.');
      }
      
      const jsonStr = match[0];
      const result = JSON.parse(jsonStr);
      
      if (result.isEmergency) {
        return {
          condition: result.condition || 'Potential Emergency',
          isEmergency: true,
          followUpQuestions: [],
          recommendation: '⚠️ This sounds like a medical emergency. Please seek immediate medical attention or go to the nearest hospital!',
        };
      }

      return {
        condition: result.condition || 'Unknown',
        isEmergency: false,
        followUpQuestions: result.followUpQuestions || [],
        recommendation: result.recommendation || 'Rest and stay hydrated. Consult a general physician if symptoms persist.',
      };
    } catch (err) {
      console.error('Symptom analysis LLM failed:', err);
      throw new Error('Failed to analyze symptoms.');
    }
  }

  /**
   * General Health and Traditional Medicine Q&A
   */
  static async askGeneralHealth(question: string, language: string = 'English'): Promise<string> {
    const prompt = `You are a medical AI assistant for TenaSync in Ethiopia. 
Answer the following general health question: "${question}".

If the question is about traditional Ethiopian medicine or dietary habits (like Teff, Beso, Telba, Moringa, Abish, Shiferaw), provide accurate health benefits and how to prepare it at home for recovery. Provide medical disclaimers.
Respond in ${language}. If the language is Amharic, ensure the output uses Amharic script.`;

    try {
      return await callLLM(prompt);
    } catch (err) {
      console.error('General health QA failed:', err);
      return 'Failed to get an answer at this time.';
    }
  }

  /**
   * Parse Prescription / Pill Image
   */
  static async parsePrescriptionImage(base64Image: string, mimeType: string): Promise<any> {
    const prompt = `Analyze this image of a medical prescription paper or pill bottle. 
Extract the following information and output it EXACTLY in this JSON format:
{
  "medications": [
    {
      "name": "Name of the drug",
      "purpose": "What it is used for in simple terms",
      "dosage": "How much to take (e.g. 500mg, 1 tablet)",
      "frequency": "When to take it (e.g. Twice a day, after meals)"
    }
  ],
  "warnings": "Any prominent warnings or side effects mentioned"
}
Output only valid JSON.`;

    try {
      const responseText = await callLLMMultimodal(prompt, mimeType, base64Image);
      
      let jsonStr = responseText;
      if (jsonStr.startsWith('\`\`\`json')) {
        jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      } else if (jsonStr.startsWith('\`\`\`')) {
        jsonStr = jsonStr.replace(/\`\`\`/g, '').trim();
      }
      
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error('Pill parsing failed:', err);
      throw new Error('Could not analyze the medical image.');
    }
  }

  /**
   * Summarize a consultation log and save to DB
   */
  static async generateSummary(consultationId: string): Promise<string> {
    const consultation = await prisma.consultationSession.findUnique({
      where: { id: consultationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!consultation) throw new Error('Consultation not found');

    const chatLog = consultation.messages.map(m => `${m.sender}: ${m.text}`).join('\n');

    const prompt = `You are a medical scribe. Summarize the following patient-AI consultation log for a human doctor. Keep it concise, highlighting primary symptoms, duration, severity, and any relevant history.

Log:
${chatLog}

Summary:`;
    try {
      const summaryText = await callLLM(prompt);
      
      // Save summary to database
      await prisma.consultationSession.update({
        where: { id: consultationId },
        // @ts-ignore: aiSummary is added to schema but types may not have refreshed
        data: { aiSummary: summaryText }
      });

      return summaryText;
    } catch (err) {
      console.error('Summary LLM failed:', err);
      return 'Failed to generate summary.';
    }
  }

  /**
   * Get specialist recommendations based on condition
   */
  static async matchSpecialist(condition: string): Promise<any[]> {
    try {
      // Look up all clinicians in DB first to know what specialties actually exist
      const clinicians = await prisma.user.findMany({
        where: { role: 'CLINICIAN' }
      });

      // Extract unique specialties
      const availableSpecialties = [...new Set(clinicians.map(c => c.specialty).filter(Boolean))];
      if (availableSpecialties.length === 0) {
        availableSpecialties.push('General Practitioner');
      }

      const prompt = `Given the patient's condition or search query: "${condition}", which ONE of the following medical specialties is the BEST match to treat them? 
      
AVAILABLE SPECIALTIES:
${availableSpecialties.join(', ')}

Respond ONLY with the exact specialty name from the list above. Do not add any other words.`;

      const specialtyResponse = await callLLM(prompt);
      const targetSpecialty = specialtyResponse.trim().toLowerCase();
      
      // Filter clinicians exactly by the AI's chosen specialty
      let matches = clinicians.filter(c => 
        c.specialty && targetSpecialty.includes(c.specialty.toLowerCase())
      );
      
      // If AI still picked something weird, fall back to General Practitioner if available
      if (matches.length === 0) {
        matches = clinicians.filter(c => c.specialty && c.specialty.toLowerCase().includes('general'));
      }
      
      // Absolute fallback if no general practitioners exist
      if (matches.length === 0) {
         matches = clinicians;
      }

      return matches.map(c => ({
        id: c.id,
        firstName: c.firstName,
        specialty: c.specialty || 'General Practitioner',
        treatmentOptions: c.treatmentOptions
      }));
    } catch (err) {
      console.error('Specialist matching failed:', err);
      return [];
    }
  }
}
