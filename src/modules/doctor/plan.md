# Doctor/Specialist Module - Implementation Plan (Seud)

## 🎯 Your Scope & Boundaries

**YOU OWN**: Everything in `src/modules/doctor/` directory
**YOU CAN MODIFY**: Only files within your module folder
**YOU CANNOT MODIFY**: 
- Other modules (patient, ai_assistant, linguistics, specialized)
- Core server.ts (except for initial route registration - already done)
- Shared utilities (unless creating doctor-specific ones in your folder)

---

## 📋 Core Features to Implement

### 1. **Doctor Verification & Onboarding** 🏥
**Priority**: HIGH
- [ ] Create verification endpoint to upgrade User role from PATIENT to CLINICIAN
- [ ] Upload and validate medical credentials/licenses
- [ ] Set `isVerifiedClinician` to true after admin approval
- [ ] Store specialty (e.g., "Spine & Posture", "Postpartum Care", "Nutrition")
- [ ] Define treatment options (In-Home, Hospital, Telehealth)

**Database Fields Used**:
```typescript
User {
  role: Role.CLINICIAN
  isVerifiedClinician: true
  specialty: string
  treatmentOptions: string[]
}
```

### 2. **Professional Profile Management** 👨‍⚕️
**Priority**: HIGH
- [ ] GET `/api/doctor/profile/:id` - Fetch doctor profile
- [ ] PUT `/api/doctor/profile/:id` - Update profile (specialty, bio, credentials)
- [ ] GET `/api/doctor/profile/:id/stats` - Get doctor statistics (total patients, consultations, ratings)

### 3. **Availability Management** 📅
**Priority**: MEDIUM
- [ ] POST `/api/doctor/availability` - Set available time slots
- [ ] GET `/api/doctor/availability/:doctorId` - Get doctor's schedule
- [ ] PUT `/api/doctor/availability/:slotId` - Update specific time slot
- [ ] DELETE `/api/doctor/availability/:slotId` - Remove availability

**Note**: You may need to create a new `DoctorAvailability` model in Prisma (coordinate with team lead)

### 4. **Patient List & Dashboard** 📊
**Priority**: HIGH
- [ ] GET `/api/doctor/patients` - List all patients assigned to this doctor
- [ ] GET `/api/doctor/patients/:patientId` - Get specific patient details
- [ ] GET `/api/doctor/patients/:patientId/history` - Get patient's medical history

**Database Query**:
```typescript
// Find all consultations where this doctor is the clinician
ConsultationSession.findMany({
  where: { clinicianId: doctorId },
  include: { patient: true, messages: true }
})
```

### 5. **Consultation Workspace** 💬
**Priority**: HIGH
- [ ] GET `/api/doctor/consultations` - List active consultations
- [ ] GET `/api/doctor/consultations/:sessionId` - Get consultation details with messages
- [ ] POST `/api/doctor/consultations/:sessionId/takeover` - Manual takeover (disable AI, enable human)
- [ ] POST `/api/doctor/consultations/:sessionId/message` - Send message to patient
- [ ] PUT `/api/doctor/consultations/:sessionId/status` - Update consultation status (COMPLETED, CANCELLED)

**Database Fields Used**:
```typescript
ConsultationSession {
  status: ConsultationStatus
  autoReplyEnabled: boolean
  lastManualActive: DateTime
  messages: ConsultationMessage[]
}
```

### 6. **Document Management** 📄
**Priority**: MEDIUM
- [ ] POST `/api/doctor/documents` - Upload medical guidelines/reference docs
- [ ] GET `/api/doctor/documents` - List doctor's uploaded documents
- [ ] DELETE `/api/doctor/documents/:docId` - Remove document

**Database Model**:
```typescript
ClinicianDocument {
  title: string
  content: string
  userId: string (doctor's ID)
}
```

---

## 🗂️ File Structure (Your Module)

```
src/modules/doctor/
├── plan.md                    (This file)
├── routes.ts                  (Express routes - already started)
├── service.ts                 (Business logic - TO CREATE)
├── types.ts                   (TypeScript interfaces - TO CREATE)
├── validation.ts              (Input validation schemas - TO CREATE)
└── utils.ts                   (Helper functions - TO CREATE)
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Set up routes.ts skeleton
- [ ] Create service.ts with Prisma client
- [ ] Create types.ts for TypeScript interfaces
- [ ] Implement doctor profile endpoints

### Phase 2: Core Features (Week 2)
- [ ] Implement patient list functionality
- [ ] Build consultation workspace endpoints
- [ ] Add manual takeover logic
- [ ] Create verification system

### Phase 3: Advanced Features (Week 3)
- [ ] Availability management system
- [ ] Document upload/management
- [ ] Statistics and analytics
- [ ] Testing and bug fixes

---

## 🔗 Integration Points

### With Other Modules:
1. **Patient Module (Eyob)**: Patients book appointments → you receive them
2. **AI Assistant (Ermiyas)**: You can take over AI consultations manually
3. **Linguistics (Yabsira)**: Messages may be translated for multilingual support
4. **Specialized (Tigistu)**: Specialized health data feeds into your patient views

### Shared Resources:
- **Prisma Client**: Import from `@prisma/client`
- **Database Models**: User, ConsultationSession, ConsultationMessage, ClinicianDocument

---

## 📝 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/profile/:id` | Get doctor profile |
| PUT | `/api/doctor/profile/:id` | Update doctor profile |
| GET | `/api/doctor/patients` | List assigned patients |
| GET | `/api/doctor/patients/:patientId` | Get patient details |
| GET | `/api/doctor/consultations` | List active consultations |
| GET | `/api/doctor/consultations/:sessionId` | Get consultation with messages |
| POST | `/api/doctor/consultations/:sessionId/takeover` | Manual takeover from AI |
| POST | `/api/doctor/consultations/:sessionId/message` | Send message to patient |
| PUT | `/api/doctor/consultations/:sessionId/status` | Update consultation status |
| POST | `/api/doctor/availability` | Set availability slots |
| GET | `/api/doctor/availability/:doctorId` | Get doctor schedule |
| POST | `/api/doctor/documents` | Upload reference document |
| GET | `/api/doctor/documents` | List documents |

---

## ✅ Next Steps

1. Review this plan and confirm it matches your understanding
2. Start with `service.ts` - create the business logic layer
3. Implement profile management first (easiest to test)
4. Move to patient list and consultation workspace
5. Test each endpoint as you build

**Questions to clarify**:
- Do you want to create a frontend UI in `src/public/modules/doctor/`?
- Should we add real-time notifications for new consultations?
- Do you need appointment scheduling or just availability management?
