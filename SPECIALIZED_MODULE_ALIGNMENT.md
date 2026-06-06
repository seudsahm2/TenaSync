# Specialized Module Alignment Review

This document serves as the definitive alignment, validation, and execution framework for the **Specialized Health Module**, owned exclusively by Tigistu. It refines the previous roadmap by strictly mapping it against the finalized TenaSync modular boundaries. The goal is to ensure zero overlap with Patient, Doctor, AI, and Linguistics modules, enabling frictionless integration and independent development.

# Confirmed Ownership

The Specialized Health Module is explicitly restricted to the following domains. Any feature outside this list belongs to another module.

**A. Spine & Posture**
- Posture Assessment
- Ergonomic Analysis
- Stretch Recommendations
- Recovery Exercises

**B. Maternal Wellness**
- Pregnancy Wellness
- Postpartum Recovery
- Pelvic Floor Recovery
- Women's Privacy Mode

**C. Ethiopian Nutrition**
- Teff Recommendations
- Telba Recommendations
- Beso Recommendations
- Moringa Recommendations
- Personalized Meal Plans

**D. Specialized Screens (`src/public/modules/specialized/`)**
- Posture Center
- Maternal Wellness Center
- Nutrition Center
- Recovery Programs

# Features To Reject

To maintain strict modularity, the following features must be **rejected** if requested or scoped into the Specialized Module during development:

- **Patient login, auth, and profile management** (Route to Eyob / Patient Module)
- **General medical history and consultation booking** (Route to Eyob / Patient Module)
- **Doctor dashboards, scheduling, or clinical treatment plans** (Route to Seud / Doctor Module)
- **NLP symptom parsing, chatbots, or direct Gemini API calls** (Route to Ermiyas / AI Module)
- **Translating UI text, voice-to-text, or text-to-speech** (Route to Yabsira / Linguistics Module)

# Integration Contracts

The Specialized Module acts as a "wellness engine" that consumes baseline data and outputs specialized insights.

**1. Patient Module (Eyob)**
- **Data Received:** User context (e.g., `userId`, `age`, `gender`, basic anthropometrics).
- **Data Returned:** Specialized program status (e.g., "Active: Spine Recovery Week 2").
- **API Boundary:** Specialized APIs expect a valid `userId` payload provided by the Patient Module's auth context.
- **Dependency Direction:** Specialized depends on Patient (read-only).

**2. Doctor Module (Seud)**
- **Data Received:** Consultation triggers (e.g., Doctor requests a posture assessment for a patient).
- **Data Returned:** Aggregated specialized reports (posture reports, maternal wellness reports, nutrition summaries).
- **API Boundary:** Specialized Module exposes an internal endpoint (e.g., `GET /api/internal/specialized/reports/:userId`) that the Doctor Module can safely consume.
- **Dependency Direction:** Doctor depends on Specialized (for reporting).

**3. AI Assistant Module (Ermiyas)**
- **Data Received:** Symptom classifications (e.g., "AI detected lower back pain -> Trigger Spine Module").
- **Data Returned:** Specialized context data injected into the AI's prompt (e.g., "User is on a Teff-based meal plan").
- **API Boundary:** AI Module sends trigger events; Specialized Module provides a context-fetch function.
- **Dependency Direction:** Bi-directional but strictly decoupled via event triggers/APIs.

**4. Linguistics Module (Yabsira)**
- **Data Received:** Translated UI text, Voice-to-text inputs (for hands-free maternal logging).
- **Data Returned:** Raw English text strings or translation keys.
- **API Boundary:** Frontend components wrap text in Linguistics hooks (e.g., `translate('spine_assessment_title')`).
- **Dependency Direction:** Specialized depends on Linguistics (for presentation).

# Backend Refinement

All backend logic must remain inside `src/modules/specialized/`.

**Recommended Structure:**
- **`routes/`**: `/api/specialized/spine`, `/api/specialized/maternal`, `/api/specialized/nutrition`
- **`controllers/`**: Extracts HTTP payloads and orchestrates service calls.
- **`services/`**:
  - `SpineService`: Ergonomic risk calculation, stretch assignment.
  - `MaternalService`: Postpartum week tracking, privacy masking.
  - `NutritionService`: Traditional food mapping, meal plan generation.
- **`validators/`**: Zod schemas for validating incoming specialized payloads (e.g., `SpineAssessmentSchema`).
- **`utils/`**: Risk calculators, BMI/BMR logic specific to Ethiopian demographics.

# Frontend Refinement

All frontend logic must remain inside `src/public/modules/specialized/`.

**Screen Hierarchy:**
- `Specialized Dashboard` (Entry Point)
  - `Posture Center` (Assessment UI, Stretch Videos/Gifs)
  - `Maternal Wellness Center` (Private Logging UI, Pelvic Floor Prompts)
  - `Nutrition Center` (Meal Plan Viewer, Traditional Ingredient Glossary)

**UX Patterns:**
- **Reusable Components:** Pain scale sliders, meal cards, week-by-week progress bars.
- **Telegram Mini App (TMA):** Use native bottom sheets for navigation. Assume standard TMA theme variables (`var(--tg-theme-button-color)`).
- **Offline Reliability:** Cache daily stretch routines and meal plans in `localStorage`.

# Database Ownership Matrix

**Fully Owned Tables (Prisma):**
- `SpineProfile` / `SpineAssessment`
- `MaternalProfile` / `MaternalLog`
- `NutritionProfile` / `MealPlan`

**Owned Fields (Examples):**
- `SpineAssessment.postureScore`, `SpineAssessment.ergonomicRisk`
- `MaternalLog.postpartumWeek`, `MaternalLog.pelvicFloorStatus`
- `NutritionProfile.preferredGrains` (e.g., Teff, Beso)

**Fields That MUST NEVER Be Duplicated:**
- Patient demographics (`name`, `email`, `DOB`, `phone`) - Fetch from Patient Module.
- Doctor details or appointment slots - Fetch from Doctor Module.
- Bot chat state or raw AI prompts - Managed by AI Module.

# Feature Dependency Map

| Specialized Feature | Prerequisites / Received Data | Output / Consumed By |
| :--- | :--- | :--- |
| **Posture Assessment** | `userId` (Patient) | Posture Report (Doctor), AI Context (AI) |
| **Maternal Privacy Mode** | `gender` check (Patient) | Encrypted/Masked UI View (Patient UI) |
| **Beso/Teff Meal Plans** | `weight`/`goals` (Patient), `symptoms` (AI) | Meal UI (Patient UI), Nutrition Summary (Doctor) |
| **Stretch Reminders** | `postureScore` (Spine DB) | TMA Notification triggers |

# Hackathon Delivery Strategy

**Phase 1: Architecture & APIs (Day 1-2)**
- Scaffold `src/modules/specialized/` and `src/public/modules/specialized/`.
- Define Prisma schemas for Spine, Maternal, and Nutrition.
- Build mocked internal endpoints to unblock the Doctor and AI modules.

**Phase 2: Core Logic (MVP) (Day 3-4)**
- Implement `NutritionService` (map traditional foods).
- Implement `SpineService` (basic risk scoring).
- Build vanilla JS frontend screens for the Centers.

**Phase 3: Integration & UX (Day 5-6)**
- Connect to Patient Module for `userId` context.
- Wrap frontend text in Linguistics Module translation hooks.
- Refine TMA mobile-first styling.

**Phase 4: Polish & Stretch Goals (Day 7)**
- "Women's Privacy Mode" toggle implementation.
- Offline caching for meal plans.
- Demo preparation.

# Team Coordination Plan

To succeed without blocking others, I need to establish the following immediately:
- **From Eyob (Patient):** Exact JWT/Auth payload structure to extract `userId`.
- **From Seud (Doctor):** The expected JSON format for the `SpecializedReport` that the Doctor UI will render.
- **From Ermiyas (AI):** The webhook or event system used when AI detects a "spine" or "nutrition" symptom.
- **From Yabsira (Linguistics):** The standard JS function name for translations (e.g., `window.t()`).

# Conflict Prevention Checklist

- [ ] I have not added any user authentication or core profile columns to Prisma.
- [ ] I have not written any AI prompt-generation code in my controllers.
- [ ] I am using Yabsira's translation wrapper instead of hardcoding Amharic text in my HTML.
- [ ] My frontend assets are strictly scoped to `src/public/modules/specialized/`.
- [ ] My backend routes are strictly prefixed with `/api/specialized/`.
- [ ] I am retrieving doctor/appointment data via Seud's APIs, not querying his tables.

# Readiness Assessment

- **Realistic:** Yes. Splitting the module into Spine, Maternal, and Nutrition provides clear, achievable micro-goals.
- **Scalable:** Yes. The service-oriented design allows each sub-module to grow independently.
- **Demo-Friendly:** Highly visual. Teff recommendations and posture scoring provide excellent interactive demo moments.
- **Hackathon-Friendly:** Yes. Strict ownership boundaries prevent merge conflicts and allow concurrent development.

# Recommended Immediate Actions

1. Commit this alignment document to the repository.
2. Conduct a 10-minute sync with Eyob, Seud, Ermiyas, and Yabsira to share the **Integration Contracts**.
3. Create the `SpineAssessment`, `MaternalLog`, and `NutritionProfile` Prisma models and open a PR.
4. Scaffold the `src/modules/specialized/` and `src/public/modules/specialized/` directories.