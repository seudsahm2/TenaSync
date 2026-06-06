import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing consultations and messages first
  await prisma.consultationMessage.deleteMany({});
  await prisma.consultationSession.deleteMany({});
  await prisma.clinicianDocument.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Clinician: Dr. Selam Aklilu (Spine, Posture, Biomechanics)
  const selam = await prisma.user.create({
    data: {
      telegramId: 111111111n,
      firstName: 'Dr. Selam Aklilu',
      username: 'selam_spine_specialist',
      role: Role.CLINICIAN,
      isVerifiedClinician: true,
      canReply: true,
      businessConnectionId: 'conn_selam_123',
      specialty: 'Spine, Posture & Biomechanics',
      treatmentOptions: ['In-Home', 'Clinic Visit'],
      documents: {
        create: [
          {
            title: 'Spine Posture Manual',
            content: 'If a patient describes back pain or neck stiffness from sitting, suggest deep diaphragmatic breaths and a standard 10° back-extension. Recommend scheduling an in-home manual therapy session.'
          }
        ]
      }
    },
  });

  // 2. Seed Clinician: Kidist Tesfaye (Maternal, Postpartum, FemTech)
  const kidist = await prisma.user.create({
    data: {
      telegramId: 222222222n,
      firstName: 'Kidist Tesfaye',
      username: 'kidist_maternal_wellness',
      role: Role.CLINICIAN,
      isVerifiedClinician: true,
      canReply: true,
      businessConnectionId: 'conn_kidist_456',
      specialty: 'Maternal, Postpartum & FemTech',
      treatmentOptions: ['In-Home', 'Telehealth'],
      documents: {
        create: [
          {
            title: 'Postpartum Pelvic Floor Guide',
            content: 'If a mother describes pelvic pain postpartum, suggest resting and avoiding heavy lifting. Recommend scheduling a telehealth consultation or an in-home assessment.'
          }
        ]
      }
    },
  });

  // 3. Seed Clinician: Dr. Kibret (Indigenous Functional Nutrition)
  const kibret = await prisma.user.create({
    data: {
      telegramId: 333333333n,
      firstName: 'Dr. Kibret (Ancestral)',
      username: 'kibret_nutrition',
      role: Role.CLINICIAN,
      isVerifiedClinician: true,
      canReply: true,
      businessConnectionId: 'conn_kibret_789',
      specialty: 'Indigenous Functional Nutrition',
      treatmentOptions: ['Telehealth', 'Clinic Visit'],
      documents: {
        create: [
          {
            title: 'Ancestral Nutrition Guidelines',
            content: 'For hypertension, recommend Barley Genfo and Moringa Tea. Avoid excess clarified spiced butter. For diabetes, recommend Teff Injera and Flaxseed. Recommend a telehealth diet consultation.'
          }
        ]
      }
    },
  });

  // 4. Seed Patient: Sample Patient for local testing
  const patient = await prisma.user.create({
    data: {
      telegramId: 999999999n,
      firstName: 'Almaz',
      username: 'almaz_patient',
      role: Role.PATIENT,
      postureStrainIndex: 45.0, // Moderate strain
      postpartumDay: 12,        // 12 days postpartum
      hypertensionFlag: false,
    },
  });

  console.log('✅ Seeding completed successfully.');
  console.log(`Created Clinicians:
- ${selam.firstName} (ID: ${selam.id}, Telegram ID: ${selam.telegramId.toString()})
- ${kidist.firstName} (ID: ${kidist.id}, Telegram ID: ${kidist.telegramId.toString()})
- ${kibret.firstName} (ID: ${kibret.id}, Telegram ID: ${kibret.telegramId.toString()})
Created Patient:
- ${patient.firstName} (ID: ${patient.id}, Telegram ID: ${patient.telegramId.toString()})`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
