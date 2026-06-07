import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js';
import { prisma } from '../db/index.js';

// ── Groq client (primary) ────────────────────────────────────────────────────
let groqClient: Groq | null = null;
if (config.GROQ_API_KEY) {
  groqClient = new Groq({ apiKey: config.GROQ_API_KEY });
  console.log('⚡ Groq AI engine initialized (primary LLM).');
}

// ── Gemini client (fallback) ─────────────────────────────────────────────────
let geminiModel: any = null;
if (config.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log('🧠 Gemini AI engine initialized (fallback LLM).');
  } catch (err) {
    console.error('❌ Gemini init failed:', err);
  }
}

// ── Unified LLM caller ───────────────────────────────────────────────────────
export async function callLLM(prompt: string): Promise<string> {
  if (groqClient) {
    try {
      const chat = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3, // Low temperature for high precision/RAG truthfulness
      });
      const text = chat.choices[0]?.message?.content?.trim() ?? '';
      if (text) return text;
    } catch (groqErr: any) {
      console.warn('[LLM] Groq failed, switching to Gemini fallback:', groqErr.message);
    }
  }

  if (geminiModel) {
    const result = await geminiModel.generateContent(prompt);
    return result.response.text().trim();
  }

  throw new Error('No LLM provider available.');
}

// ── Multimodal LLM caller (Gemini Only) ──────────────────────────────────────
export async function callLLMMultimodal(prompt: string, mimeType: string, base64Data: string): Promise<string> {
  if (geminiModel) {
    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ];
    try {
      const result = await geminiModel.generateContent([prompt, ...imageParts]);
      return result.response.text().trim();
    } catch (err: any) {
      console.error('[LLM] Gemini multimodal failed:', err.message);
      throw err;
    }
  }
  throw new Error('Gemini model is required for image analysis.');
}

export interface ConsultationResult {
  replyText: string;
  autoReplyEnabled: boolean;
  fallbackTriggered: boolean;
}

/**
 * RAG Consultation Turn: Reads clinician documents to answer patient symptoms.
 * Pauses auto-reply and triggers manual doctor handover if answer isn't in guidelines.
 */
export async function processClinicianConsultationTurn(
  consultationId: string,
  patientText: string
): Promise<ConsultationResult> {
  const consultation = await prisma.consultationSession.findUnique({
    where: { id: consultationId },
    include: {
      // @ts-ignore
      patient: {
        include: {
          patientProfile: true,
          recoveryLogs: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      },
      clinician: {
        include: { documents: true }
      },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!consultation) throw new Error(`Consultation session ${consultationId} not found`);

  // @ts-ignore
  const clinician = consultation.clinician;
  const docs = clinician.documents || [];

  // 1. Compile clinician document guidelines
  const guidelinesContext = docs.length > 0
    // @ts-ignore
    ? docs.map((d, index) => `--- Document ${index + 1}: ${d.title} ---\n${d.content}`).join('\n\n')
    : "No reference guideline documents uploaded yet by this clinician.";

  // 2. Compile Patient Metrics Context
  // @ts-ignore
  const pProfile = consultation.patient.patientProfile;
  // @ts-ignore
  const pLogs = consultation.patient.recoveryLogs || [];
  
  let patientContext = `Age: ${pProfile?.age || 'Unknown'}\n`;
  patientContext += `Gender: ${pProfile?.gender || 'Unknown'}\n`;
  patientContext += `Existing Conditions: ${pProfile?.existingConditions || 'None reported'}\n`;
  patientContext += `Previous Injuries: ${pProfile?.previousInjuries || 'None reported'}\n`;
  patientContext += `Allergies: ${pProfile?.allergies || 'None reported'}\n`;
  patientContext += `Current Medications: ${pProfile?.currentMedications || 'None reported'}\n`;
  if (pLogs.length > 0) {
    patientContext += `Recent Pain Level: ${pLogs[0].painLevel}/10 (Mobility: ${pLogs[0].mobility})\n`;
  }

  console.log(`[RAG Engine] Loaded ${docs.length} document(s) for clinician ${clinician.firstName}`);

  // 3. Build precision RAG prompt for medical consultation and booking
  const prompt = `
You are an advanced medical front-desk AI assistant representing Dr. ${clinician.firstName}, a specialist in ${clinician.specialty || 'somatic health'}. 
Your task is to answer the patient's symptoms or questions based STRICTLY on the clinician's reference guidelines provided below, and help them book an appropriate appointment.

=== CLINICIAN REFERENCE GUIDELINES ===
${guidelinesContext}

=== PATIENT PROFILE METRICS (DO NOT ASK FOR THESE, USE THEM TO INFORM YOUR DIAGNOSIS) ===
${patientContext}
======================================

Patient's message: "${patientText}"

RULES FOR ANSWERING:
1. You must answer the patient's question or address their symptoms ONLY if the answer is explicitly stated in or directly derived from the CLINICIAN REFERENCE GUIDELINES.
2. If the guidelines are missing, but you can give safe, general advice based on the Patient Profile Metrics, do so.
3. Keep the answer professional, warm, and clear (2-4 sentences max). Do not ask for information already provided in the Patient Profile Metrics. Ask if their data is up to date if relevant to the treatment.
4. After addressing their medical query, guide them towards booking an appointment. Ask if they prefer:
   - In-Home Treatment (private visit to their location)
   - Hospital/Clinic Visit (they come to the facility)
   - Telehealth Consultation (video/phone call)
5. If the patient asks about scheduling or mentions wanting to book, help them choose a convenient time.

Answer:`;

  let replyText = '';
  try {
    replyText = await callLLM(prompt);
  } catch (err: any) {
    console.error('[RAG Engine] LLM invocation failed:', err.message);
    replyText = '[NOT_FOUND]';
  }

  // 3. Process [NOT_FOUND] flag (Human takeover)
  if (replyText.includes('[NOT_FOUND]') || !replyText.trim()) {
    console.log(`[RAG Engine] ⚠️ Answer not found in clinician docs. Pausing auto-reply for session ${consultation.sessionId}.`);

    // Disable auto-reply for this consultation
    await prisma.consultationSession.update({
      where: { id: consultationId },
      data: { autoReplyEnabled: false }
    });

    return {
      replyText: "I am handing you over to the doctor. They will review your symptoms and respond manually shortly.",
      autoReplyEnabled: false,
      fallbackTriggered: true
    };
  }

  // Answer found — record turn
  await prisma.consultationSession.update({
    where: { id: consultationId },
    data: { updatedAt: new Date() }
  });

  return {
    replyText,
    autoReplyEnabled: true,
    fallbackTriggered: false
  };
}
