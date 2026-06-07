# TenaSync Full-Stack Patient & AI Integration Plan

## 1. Overview
To prepare TenaSync for production deployment, we are expanding the Patient and AI Assistant modules to support advanced clinical workflows. This includes integrating Multimodal AI (Prescription & Pill recognition), Ancestral Ethiopian Botanical remedies, multilingual support (Amharic & Voice placeholders), doctor ratings, and fixing the appointments calendar views.

---

## 2. Comprehensive Feature Upgrades

### Feature 1: Multimodal Pill & Medical Paper Analyzer (Gemini Multimodal)
- **Objective**: Let patients upload photos of pharmacy prescription papers or pill bottles. The AI will explain what they are, what they do, and when to take them, and then automatically schedule medication reminders in the app.
- **Backend Endpoint**: `POST /api/ai/analyze-prescription` (accepts base64 image or mock file and uses Gemini 2.0 Flash to parse).
- **Frontend UI**: "Upload Prescription 📷" button inside the Medication Reminders panel.

### Feature 2: General Disease, Medicine & Traditional Apothecary Q&A
- **Objective**: Let patients ask the AI *any* health-related question, offering both Western guidelines and localized Ethiopian Traditional Medicine (Teff, Telba, Beso, Moringa, Abish, Shiferaw) for home treatment.
- **Backend Service**: Expand the symptom analyzer prompts inside `service.ts` to automatically fetch remedies from the Ancestral Nutrition mapping database.

### Feature 3: Deeper AI Consultation with Doctors List & Amharic Support
- **Objective**: The AI should guess the patient's condition, ask for additional clarifying questions, list recommended doctors in their geographic area (using real DB matching), and support Amharic responses.
- **Voice Functionality**: Implement voice recording simulation toggles (Voice-to-Text / Text-to-Speech) for Ethiopian dialects.

### Feature 4: Fixing Appointments & Specialist Views
- **Objective**: Resolve the bugs causing appointments not to render, and ensure patients can see doctor ratings.
- **Database Schema**: Add `rating Float @default(5.0)` and `reviewCount Int @default(1)` to the `User` model.
- **Feedback UI**: Add a rating/review overlay when a session is set to `COMPLETED`.

### Feature 5: Module Viewer for Specialized Modules (Tigistu's Work)
- **Objective**: Integrate a beautiful, cohesive tabbed interface where patients can access Tigistu's Spine Strain indices, Postpartum recovery logs, and Ancestral Apothecary directly from their Patient Portal.

---

## 3. Step-by-Step Implementation Checklist

### Step 1: Database Updates (Prisma)
- [ ] Add `rating` and `reviewCount` to the `User` model in `schema.prisma`.
- [ ] Add `MedicationReminder` model to `schema.prisma`.
- [ ] Run `npx prisma db push`.

### Step 2: Implement Advanced Backend AI Service (`ai_assistant/service.ts`)
- [ ] **Prescription Image Parser**: Create a function `parsePrescriptionImage(base64Image: string)` using Gemini's multimodal capabilities.
- [ ] **Disease & Botanical Botanical QA**: Create a unified query engine `askGeneralHealth(question: string)` that suggests home remedies utilizing Ethiopian traditional superfoods (Teff, Telba, Beso).
- [ ] **Enhanced Consultation**: Update `analyzeSymptoms` to return a guessed condition, ask for additional info, suggest matched area doctors, and support Amharic translation.

### Step 3: Implement Frontend UI & Controller Wiring
- [ ] **Medication Reminder Widget**: Add the list UI to `patient/public/index.html`. Add an upload input for OCR prescription parsing.
- [ ] **Fix Patient Appointments view**: Repair the `fetchAppointments` function in `patient/public/app.js` to properly map database fields.
- [ ] **Doctor Rating overlay**: Add a star rating input to allow patients to rate doctors upon consultation completion.
- [ ] **Voice simulation buttons**: Embed microphone and speaker buttons in the AI Chat.

---

## 4. Let's Begin the Implementation!
We will execute this plan sequentially, starting with the database schema updates and the advanced AI backend services.