# ጤና-Sync (TenaSync)
### Autonomous, Decentralized, Privacy-Preserving Somatic Health Marketplace

---

## Overview

TenaSync bridges high-friction gaps in the Ethiopian healthcare landscape by connecting patients in urban centers (Addis Ababa, Hawassa, Adama) with vetted somatic physical therapists, osteopaths, and FemTech coaches — natively inside Telegram.

**Key Design Principle:** Only the **clinician side** is automated via an AI front-desk Secretary. The **patient is always a real human** negotiating directly in the chat.

---

## Features

### 🤖 Clinician AI Secretary (Business Connection Mode)
- Clinicians connect their **Telegram Business Account** to the bot via _Settings → Telegram Business → Chatbots_
- The AI Secretary automatically responds to incoming patient messages and negotiates service rates
- **Self-loop prevention:** If the clinician types manually, the AI stands down for 30 minutes
- **Auto-registration:** Any clinician who connects is automatically registered in the database

### 👤 Guest Mode Stealth Interception
- Bot intercepts `@mentions` in public group chats containing clinical keywords (Amharic & English)
- Responds within the Telegram 10-second window via `answerGuestQuery`
- Routes the user to a secure private TMA landing page via inline button

### 💰 Double-Blind Negotiation Engine
- Patient proposes a budget; the Clinician AI evaluates it against the secret `sellerMinFloor`
- If patient offer ≥ floor → `[DEAL_ACCEPTED]` instantly
- If below → clinician concedes:
  ```
  ΔP = γ * P_orig    where γ ~ U(0.015, 0.045)
  P_next,s = max(P_prev - ΔP, P_limit,s)
  ```
- Maximum 6 concession rounds before termination
- `sellerMinFloor` is **never** exposed to the client, browser, or logs

### 🔬 Telegram Mini App (TMA) — 3 Diagnostic Pillars

**1. Posture Stress Index Simulator**
- Interactive SVG spinal column with C3-C7 cervical and L4-L5 lumbar focus points
- Real-time tension score: `T_spine = min(100, (H_sedentary × 6.5) + (S_index × 4.0))`
- Color-coded states: 🟢 Green (< 40), 🟡 Amber (40-74), 🔴 Flashing Red (≥ 75)

**2. Maternal Postpartum Recovery Tracker**
- Day-by-day Aras period tracking
- One-tap anonymous referral dispatch to female FemTech specialists
- Confidential: logs are never stored on public servers

**3. Ancestral Nutrition Compiler**
- Maps clinical conditions to Ethiopian traditional remedies:
  - Hypertension → Barley Genfo + Moringa (Shiferaw) Tea
  - Diabetes → Teff Injera + Flaxseed (Telba)
  - Postpartum → Beso Barley + Fenugreek (Abish)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) + TypeScript |
| Framework | Express.js |
| Bot | Telegraf v4 (Telegram Bot API 10.0+) |
| AI | Google Gemini 2.0 Flash |
| Database | PostgreSQL via Prisma ORM |
| Dev Runner | tsx (ESM-native TS runner) |
| Frontend | Vanilla HTML/CSS/JS (Obsidian dark, Glassmorphism) |

---

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally
- A Telegram Bot Token (from @BotFather)
- A Google Gemini API Key

### 2. Install
```bash
cd TenaSync
npm install
```

### 3. Configure Environment
Edit `.env`:
```env
PORT=3000
TMA_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/tenasync?schema=public"
BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Initialize Database
```bash
npx prisma db push
npm run seed
```

### 5. Run Dev Server
```bash
npm run dev
```

The Express server starts on `http://localhost:3000` and the Telegraf bot begins polling.

---

## Clinician Onboarding Flow
1. Clinician opens **Telegram → Settings → Telegram Business → Chatbots**
2. Adds the TenaSync bot as their chatbot
3. Bot receives a `business_connection` update and **auto-registers** the clinician
4. Clinician receives a welcome DM explaining how the AI Secretary works
5. Patients can now message the clinician's account — the AI Secretary handles everything

---

## Patient Flow
1. Patient finds clinician via the TMA or public group mention
2. Patient messages the clinician's personal Telegram account directly
3. AI Secretary greets patient and initiates price negotiation
4. If deal reached: Escrow payment links are sent to both parties
5. Patient pays via Telebirr/CBE Birr through the TMA checkout

---

## Security Notes
- `sellerMinFloor` is stored server-side only and **never** serialized into API responses or client-side JavaScript
- All patient maternal logs are processed anonymously — no PII stored
- Business connection messages from `is_self = true` are silently logged but never trigger AI responses

---

## Project Structure
```
TenaSync/
├── src/
│   ├── bot/handlers/          # Telegram update handlers
│   │   ├── guestMessage.ts   # Guest Mode stealth interceptor
│   │   ├── businessMsg.ts    # Secretary Mode + self-loop prevention
│   │   └── negotiation.ts    # Deal finalization + escrow dispatch
│   ├── core/
│   │   ├── ai/               # Gemini LLM integration + negotiation engine
│   │   ├── db/               # Prisma client
│   │   └── biometrics/       # Spine tension formulas + nutrition mappings
│   ├── config/               # Environment variable loader
│   └── public/               # Telegram Mini App frontend
│       ├── index.html        # Main TMA dashboard (3-tab workspace)
│       ├── diagnostics.html  # Guest Mode handoff landing page
│       ├── css/main.css      # Obsidian dark + glassmorphism styles
│       └── js/               # Interactive TMA logic + API client
├── prisma/
│   ├── schema.prisma         # User, Negotiation, NegotiationMessage models
│   └── seed.ts               # Dev clinician seed data
└── server.ts                 # Express server + webhook routes
```
