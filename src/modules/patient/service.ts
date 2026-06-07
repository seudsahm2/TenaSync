import { prisma } from '../../core/db/index.js';

export class PatientService {
    /**
     * Get or create patient profile
     */
    static async getProfile(userId: string) {
        // @ts-ignore
        let profile = await prisma.patientProfile.findUnique({
            where: { userId }
        });

        if (!profile) {
            // Create empty default profile
            // @ts-ignore
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
        // @ts-ignore
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
            // @ts-ignore
            return prisma.patientProfile.create({
                data: {
                    userId,
                    ...updateData
                }
            });
        }

        // @ts-ignore
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
        // @ts-ignore
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
        // @ts-ignore
        return prisma.recoveryLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Add a new daily recovery log entry
     */
    static async addRecoveryLog(userId: string, data: any) {
        // @ts-ignore
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

    /**
     * Get medication reminders
     */
    static async getReminders(userId: string) {
        // @ts-ignore
        return prisma.medicationReminder.findMany({
            where: { userId },
            orderBy: { time: 'asc' }
        });
    }

    /**
     * Add a medication reminder
     */
    static async addReminder(userId: string, data: any) {
        // @ts-ignore
        return prisma.medicationReminder.create({
            data: {
                userId,
                medName: data.medName,
                dosage: data.dosage,
                time: data.time,
                description: data.description || null
            }
        });
    }

    /**
     * Delete a medication reminder
     */
    static async deleteReminder(userId: string, reminderId: string) {
        // @ts-ignore
        return prisma.medicationReminder.delete({
            where: { id: reminderId, userId }
        });
    }

    /**
     * Rate a doctor
     */
    static async rateDoctor(doctorId: string, rating: number) {
        const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
        if (!doctor || doctor.role !== 'CLINICIAN') return null;

        // @ts-ignore - rating fields might not be typed yet
        const currentRating = doctor.rating || 5.0;
        // @ts-ignore
        const count = doctor.reviewCount || 1;

        const newCount = count + 1;
        const newRating = ((currentRating * count) + rating) / newCount;

        return prisma.user.update({
            where: { id: doctorId },
            // @ts-ignore
            data: { rating: newRating, reviewCount: newCount }
        });
    }

    /**
     * Get completed consultations for history
     */
    static async getCompletedConsultations(userId: string) {
        return prisma.consultationSession.findMany({
            where: { patientId: userId, status: 'COMPLETED' },
            include: { clinician: true },
            orderBy: { updatedAt: 'desc' }
        });
    }
}
