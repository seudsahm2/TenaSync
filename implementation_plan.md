# TenaSync Distributed Team Implementation Plan

This plan restructures the codebase to support 5 developers pushing to the `master` branch concurrently without causing merge conflicts. We achieve this by adopting a **Vertical Slice / Modular Architecture**, where each student owns a specific isolated directory (`src/modules/[module_name]`) containing their own routes, logic, and frontend components.

## Team Assignments & Module Ownership

| Team Member | Module Ownership | Directory | Core Focus |
|-------------|------------------|-----------|------------|
| **Eyob** | 🧑‍🦱 **Patient/Customer Module** | `src/modules/patient/` | Patient profiles, medical history, symptom submission, appointment booking, recovery tracking, and privacy controls. |
| **Seud** | 👩‍⚕️ **Doctor/Specialist Module** | `src/modules/doctor/` | Doctor verification, availability, patient list, consultation workspace, and professional dashboards. |
| **Ermiyas** | 🤖 **AI Health Assistant Module** | `src/modules/ai_assistant/` | Enhancing the current `engine.ts` for deep symptom analysis, follow-up questions, emergency detection, and AI patient summaries. |
| **Yabsira** | 🌍 **Linguistics & Communication Module** | `src/modules/linguistics/` | Adding Amharic, Afaan Oromo, Tigrinya support, voice-to-text, and translating bot/TMA interactions. |
| **Tigistu** | 🧘 **Specialized Health Modules** | `src/modules/specialized/` | Enhancing the existing Spine, Maternal, and Ancestral Nutrition logic with deep ergonomic analysis and personalized meal plans. |

---

## Proposed Folder Structure

To guarantee zero merge conflicts, the `src/modules` directory will be created, and everyone will write their backend logic inside their respective folder. We will also create isolated frontend folders in `src/public/modules/`.

```text
TenaSync/
├── src/
│   ├── server.ts                  (Shared: Only modified to import module routes)
│   ├── modules/
│   │   ├── patient/               (Owned by Eyob)
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── doctor/                (Owned by Seud)
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── ai_assistant/          (Owned by Ermiyas)
│   │   │   └── ...
│   │   ├── linguistics/           (Owned by Yabsira)
│   │   │   └── ...
│   │   └── specialized/           (Owned by Tigistu)
│   │       └── ...
│   └── public/
│       ├── index.html             (Shared: Root entry point)
│       └── modules/
│           ├── patient/           (Owned by Eyob)
│           ├── doctor/            (Owned by Seud)
│           ├── ai_assistant/      (Owned by Ermiyas)
│           ├── linguistics/       (Owned by Yabsira)
│           └── specialized/       (Owned by Tigistu)
```

## Integration with Existing Work

TenaSync already has a working base with Prisma schema, AI Consultation matching (`/api/clinicians/match`), and a unified Telegram Mini App (`index.html`). 

### How we migrate smoothly:
1. **Existing Code**: The current `engine.ts` and `businessMsg.ts` will act as the core engine. Ermiyas and Tigistu will build *on top* of these.
2. **Routing Isolation**: Instead of everyone editing `src/server.ts`, each developer will export an `Express.Router()` from their module. `server.ts` will simply do:
   ```typescript
   import patientRoutes from './modules/patient/routes.js';
   app.use('/api/patient', patientRoutes);
   ```
   This means nobody edits `server.ts` simultaneously.
3. **Frontend Isolation**: Instead of adding 1,000 lines to `app.js`, each student will write their UI components in `src/public/modules/[name]/` and load them dynamically or via separate script tags.

## User Review Required

> [!IMPORTANT]
> Please review the module assignments (Eyob, Seud, Ermiyas, Yabsira, Tigistu). If these roles look correct, approve this plan and I will immediately:
> 1. Create all the isolated folders for the backend (`src/modules/*`).
> 2. Create the isolated folders for the frontend (`src/public/modules/*`).
> 3. Generate dummy `routes.ts` files for each student so they can begin working immediately.
