`# AI Health Assistant Module - Detailed Implementation Plan

## 1. Overview
This module acts as the core "brain" of the TenaSync system. It is owned by **Seud** and focuses exclusively on symptom analysis, AI-driven consultations, emergency detection, and generating actionable health summaries and recommendations. 

All backend code will reside in `src/modules/ai_assistant/` and all frontend code will reside in `src/public/modules/ai_assistant/`. This isolated approach guarantees no merge conflicts with other teams.

## 2. Features to Implement
Based on the main project plan, this module covers:
- **Symptom Analyzer:** Parse and analyze user-reported symptoms.
- **AI Consultation & Follow-Up Questions:** A dynamic question-answering flow.
- **Emergency Detection:** Identify critical keywords/symptoms and trigger alerts.
- **AI Patient Summaries:** Condense chat logs into medical summaries for doctors.
- **Health & Recovery Suggestions:** General wellness and recovery tips.
- **Specialist Recommendations:** Route users to the appropriate doctor based on the summary.
- **AI Secretary:** Manage automated replies and scheduling context.

## 3. Directory Structure for the Module
To keep everything contained, the AI Assistant module will have the following structure:

```text
TenaSync/
├── src/
│   ├── modules/
│   │   └── ai_assistant/
│   │       ├── routes.ts         (Express router for AI endpoints)
│   │       ├── controller.ts     (Request handlers)
│   │       ├── service.ts        (Core logic, integrates with core/ai/engine.ts)
│   │       ├── prompts.ts        (System prompts for LLMs)
│   │       ├── types.ts          (TypeScript interfaces)
│   │       └── plan.txt          (Original feature list)
│   │
│   └── public/
│       └── modules/
│           └── ai_assistant/
│               ├── app.js        (Frontend logic for AI views)
│               ├── style.css     (Specific styles for AI chat/reports)
│               └── views/
│                   ├── chat.html             (AI Chat Screen)
│                   ├── results.html          (Consultation Results Screen)
│                   ├── reports.html          (AI Reports Screen)
│                   └── emergency.html        (Emergency Alerts Component)
```

## 4. Step-by-Step Execution Plan

### Step 1: Set Up Backend Foundation
- [ ] Create `service.ts` in `src/modules/ai_assistant/`. This will import functionality from the shared `src/core/ai/engine.ts` but expand upon it with specific functions like `analyzeSymptoms()`, `detectEmergency()`, and `generateSummary()`.
- [ ] Create `controller.ts` to wire up the HTTP request and response flow.
- [ ] Update `routes.ts` to map endpoints (e.g., `POST /analyze`, `POST /chat`, `GET /summary/:id`).

### Step 2: Implement the AI Engine Wrapper (Service Layer)
- [ ] **Emergency Detection:** Create logic to pre-screen user input for high-risk keywords (e.g., "chest pain", "bleeding", "fainting") and return immediate alert flags.
- [ ] **Symptom Analyzer & Follow-ups:** Build a prompt chain that takes initial symptoms and returns follow-up questions to clarify the condition.
- [ ] **Patient Summaries:** Implement a function that takes a completed consultation history and uses the LLM to generate a concise summary for the `Doctor Module`.
- [ ] **Specialist Routing:** Map identified conditions to specialist types.

### Step 3: Frontend UI Components
- [ ] Develop the **AI Chat Interface** (`chat.html` + `app.js`). This will include message bubbles, typing indicators, and a clean text input.
- [ ] Develop the **Emergency Alert Banner** to conditionally render when the backend detects an emergency.
- [ ] Develop the **Consultation Results & Reports View** to display the final AI summary, health recommendations, and suggested specialist.

### Step 4: Integration & API Wiring
- [ ] Connect the AI Chat UI to the `POST /chat` endpoint.
- [ ] Ensure the AI patient summaries can be saved to the database (using shared Prisma schemas) so the Doctor module can retrieve them.
- [ ] Test the entire flow from initial symptom input -> follow up questions -> summary generation.

## 5. Rules for Modifying Code
- **DO NOT** edit files in `src/modules/patient/`, `src/modules/doctor/`, `src/modules/linguistics/`, or `src/modules/specialized/`.
- Only use `src/core/ai/engine.ts` as a shared utility; do not heavily modify it unless required by the whole team. Add specific logic to `src/modules/ai_assistant/service.ts`.
- Expose endpoints cleanly via `routes.ts` so the global `server.ts` can consume them easily.

By following this plan, Seud's AI Health Assistant module can be built independently and integrated flawlessly.