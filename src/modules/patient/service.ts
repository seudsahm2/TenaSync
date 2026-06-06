import { prisma } from '../../core/db/index.js';

export class PatientService {
    /**
     * Get or create patient profile
     */
    static async getProfile(userId: string) {
        let profile = await prisma.patientProfile.findUnique({
            where: { userId }
        });

        if (!profile) {
            // Create empty default profile
            profile = await prisma.patientProfile.create({
                data: {
                    userId,
                    preferredLanguage: 'English'
                }
            });
        }

        return profile;
    }

    /**
     * Update patient profile
     */
    static async updateProfile(userId: string, data: any) {
        const profile = await prisma.patientProfile.findUnique({
            where: { userId }
        });

        const updateData = {
            fullName: data.fullName,
            age: data.age ? parseInt(data.age, 10) : undefined,
            gender: data.gender,
            phoneNumber: data.phoneNumber,
            preferredLanguage: data.preferredLanguage || 'English',
            location: data.location,
            emergencyContact: data.emergencyContact,
            occupation: data.occupation,
            activityLevel: data.activityLevel,
            workStyle: data.workStyle,
            existingConditions: data.existingConditions,
            allergies: data.allergies,
            currentMedications: data.currentMedications,
            previousInjuries: data.previousInjuries,
            anonymousMode: data.anonymousMode !== undefined ? !!data.anonymousMode : undefined,
            womensPrivacyMode: data.womensPrivacyMode !== undefined ? !!data.womensPrivacyMode : undefined,
        };

        if (!profile) {
            return prisma.patientProfile.create({
                data: {
                    userId,
                    ...updateData
                }
            });
        }

        return prisma.patientProfile.update({
            where: { userId },
            data: updateData
        });
    }

    /**
     * Fetch patient dashboard overview statistics
     */
    static async getDashboardStats(userId: string) {
        // 1. Fetch upcoming appointments (ConsultationSession where status is ACTIVE and scheduledTime > now)
        const upcomingAppointments = await prisma.consultationSession.findMany({
            where: {
                patientId: userId,
                status: 'ACTIVE',
                scheduledTime: {
                    gt: new Date()
                }
            },
            include: {
                clinician: true
            },
            orderBy: {
                scheduledTime: 'asc'
            }
        });

        // 2. Fetch recovery logs to compute progress
        const recoveryLogs = await prisma.recoveryLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 7
        });

        const averagePain = recoveryLogs.length > 0
            ? recoveryLogs.reduce((acc: number, log: any) => acc + log.painLevel, 0) / recoveryLogs.length
            : 0;

        const completedExercises = recoveryLogs.filter((log: any) => log.exerciseCompleted).length;

        // 3. Fetch latest active consultation session symptoms
        const activeConsultation = await prisma.consultationSession.findFirst({
            where: {
                patientId: userId,
                status: 'ACTIVE'
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                clinician: true
            }
        });

        return {
            upcomingAppointment: upcomingAppointments[0] || null,
            appointmentCount: upcomingAppointments.length,
            averagePain: parseFloat(averagePain.toFixed(1)),
            completedExercisesCount: completedExercises,
            recoveryLogCount: recoveryLogs.length,
            activeConsultation: activeConsultation ? {
                id: activeConsultation.id,
                sessionId: activeConsultation.sessionId,
                clinicianName: activeConsultation.clinician.firstName,
                specialty: activeConsultation.clinician.specialty,
                symptoms: activeConsultation.patientSymptoms,
                createdAt: activeConsultation.createdAt
            } : null
        };
    }

    /**
     * Get all consultation sessions/appointments for a patient
     */
    static async getAppointments(userId: string) {
        return prisma.consultationSession.findMany({
            where: { patientId: userId },
            include: { clinician: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Update or schedule appointment details
     */
    static async scheduleAppointment(sessionId: string, scheduledTime: string, type: string) {
        return prisma.consultationSession.update({
            where: { sessionId },
            data: {
                scheduledTime: new Date(scheduledTime),
                consultationType: type
            },
            include: { clinician: true }
        });
    }

    /**
     * Get recovery logs
     */
    static async getRecoveryLogs(userId: string) {
        return prisma.recoveryLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Add a new daily recovery log entry
     */
    static async addRecoveryLog(userId: string, data: any) {
        return prisma.recoveryLog.create({
            data: {
                userId,
                painLevel: parseInt(data.painLevel, 10),
                energyLevel: data.energyLevel || 'Medium',
                mobility: data.mobility || 'No Change',
                exerciseCompleted: !!data.exerciseCompleted,
                notes: data.notes || ''
            }
        });
    }
}
