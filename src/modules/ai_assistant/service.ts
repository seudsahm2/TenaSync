import { callLLM } from '../../core/ai/engine.js';
import { prisma } from '../../core/db/index.js';

export interface SymptomAnalysisResult {
  condition: string;
  isEmergency: boolean;
  followUpQuestions: string[];
  recommendation: string;
}

export class AIAssistantService {
  /**
   * Emergency Detection pre-screen.
   * Simple keyword based screening combined with LLM assessment if needed.
   */
  static async detectEmergency(symptoms: string): Promise<boolean> {
    const emergencyKeywords = ['chest pain', 'bleeding', 'fainting', 'unconscious', 'heart attack', 'stroke', 'suicide', 'cannot breathe'];
    const lowerSymptoms = symptoms.toLowerCase();
    
    // Quick keyword check
    for (const keyword of emergencyKeywords) {
      if (lowerSymptoms.includes(keyword)) {
        return true;
      }
    }

    // LLM fallback for deeper check
    const prompt = `Analyze these symptoms: "${symptoms}". Is this a life-threatening medical emergency requiring immediate hospitalization or an ambulance? Reply ONLY with "YES" or "NO".`;
    try {
      const response = await callLLM(prompt);
      return response.toUpperCase().includes('YES');
    } catch (err) {
      console.error('Emergency detection LLM failed:', err);
      return false; // Err on side of false if LLM fails, we already did keyword check
    }
  }

  /**
   * Analyze symptoms and return follow-up questions
   */
  static async analyzeSymptoms(symptoms: string): Promise<SymptomAnalysisResult> {
    const isEmergency = await this.detectEmergency(symptoms);
    
    if (isEmergency) {
      return {
        condition: 'Potential Emergency',
        isEmergency: true,
        followUpQuestions: [],
        recommendation: 'Please seek immediate medical attention or go to the nearest emergency room.',
      };
    }

    const prompt = `You are an AI Medical Assistant for TenaSync. 
Analyze the following patient consultation log / symptoms: 
"${symptoms}"

Provide a JSON response with the following format:
{
  "condition": "Possible condition(s) (Keep it general, not a diagnosis)",
  "followUpQuestions": ["Question 1", "Question 2", "Question 3"],
  "recommendation": "Brief general advice or what type of doctor they should see"
}

Reply ONLY with valid JSON.`;

    try {
      const resultStr = await callLLM(prompt);
      // Try to parse JSON from the string
      // Sometimes LLMs wrap JSON in markdown blocks
      let jsonStr = resultStr;
      if (jsonStr.startsWith('\`\`\`json')) {
        jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      }
      
      const result = JSON.parse(jsonStr);
      return {
        condition: result.condition || 'Unknown',
        isEmergency: false,
        followUpQuestions: result.followUpQuestions || [],
        recommendation: result.recommendation || 'Consult a general physician.',
      };
    } catch (err) {
      console.error('Symptom analysis LLM failed:', err);
      throw new Error('Failed to analyze symptoms.');
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
    const prompt = `Given the condition: "${condition}", what is the ONE best medical specialty that should treat this? Respond ONLY with the specialty name (e.g. "Cardiologist", "Neurologist", "General Practitioner", "Spine & Posture", "Postpartum Care").`;
    try {
      const specialtyResponse = await callLLM(prompt);
      const targetSpecialty = specialtyResponse.trim();
      
      // Look up clinicians in DB matching this specialty (fuzzy match)
      const clinicians = await prisma.user.findMany({
        where: { role: 'CLINICIAN' }
      });
      
      // Basic filtering, if none match exactly return all so frontend can at least show general practitioners
      let matches = clinicians.filter(c => 
        c.specialty && c.specialty.toLowerCase().includes(targetSpecialty.toLowerCase())
      );
      
      if (matches.length === 0) {
        matches = clinicians; // fallback
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
