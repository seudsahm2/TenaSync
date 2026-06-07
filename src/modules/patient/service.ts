import { prisma } from '../../core/db/index.js';

export class PatientService {
    /**
     * Login or create user
     */
    static async loginUser(telegramIdStr: string, nameFallback: string) {
        // For local testing fallback (e.g. web_12345)
        let isLocal = telegramIdStr.startsWith('web_');
        let tId = isLocal ? BigInt(Math.floor(Math.random() * 1000000)) : BigInt(telegramIdStr);
        
        // Try to find user by telegram ID
        let user = null;
        try {
            user = await prisma.user.findUnique({
                where: { telegramId: tId }
            });
        } catch (e) {
            // Ignore format errors
        }

        if (!user) {
            user = await prisma.user.create({
                data: {
                    telegramId: tId,
                    firstName: nameFallback || 'Patient',
                    role: 'PATIENT'
                }
            });
        }
        return user;
    }

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
     * Get ALL consultations (for chat UI list)
     */
    static async getAllConsultations(userId: string) {
        return prisma.consultationSession.findMany({
            where: { patientId: userId },
            include: { clinician: true },
            orderBy: { updatedAt: 'desc' }
        });
    }

    /**
     * Send a message from patient to doctor via Web App
     */
    static async sendMessage(userId: string, sessionId: string, text: string) {
        const consultation = await prisma.consultationSession.findFirst({
            where: { sessionId, patientId: userId },
            include: { patient: true, clinician: true }
        });

        if (!consultation) throw new Error('Consultation not found');

        // Create the user message
        const message = await prisma.consultationMessage.create({
            data: {
                consultationId: consultation.id,
                sender: 'PATIENT',
                text
            }
        });

        await prisma.consultationSession.update({
            where: { id: consultation.id },
            data: { updatedAt: new Date() }
        });

        // Broadcast patient message to sockets
        try {
            const { io } = await import('../../server.js');
            io.to(`consultation_${sessionId}`).emit('new_message', {
                id: message.id,
                sender: 'PATIENT',
                text,
                createdAt: message.createdAt
            });
        } catch(e) {}

        // If auto-reply is enabled, process the AI turn!
        if (consultation.autoReplyEnabled) {
            try {
                // To avoid circular dependency, dynamically import engine
                const { processClinicianConsultationTurn } = await import('../../core/ai/engine.js');
                
                // Add a small delay for realism
                setTimeout(async () => {
                    try {
                        const aiResult = await processClinicianConsultationTurn(consultation.id, text);
                        
                        // Save AI reply
                        const aiMsg = await prisma.consultationMessage.create({
                            data: {
                                consultationId: consultation.id,
                                sender: 'CLINICIAN',
                                text: aiResult.replyText
                            }
                        });

                        const { io } = await import('../../server.js');
                        io.to(`consultation_${sessionId}`).emit('new_message', {
                            id: aiMsg.id,
                            sender: 'CLINICIAN',
                            text: aiMsg.text,
                            createdAt: aiMsg.createdAt
                        });
                    } catch (e) {
                        console.error('AI Auto-reply failed:', e);
                    }
                }, 1500);
            } catch (e) {
                console.error(e);
            }
        }

        return message;
    }

    /**
     * Get consultation messages
     */
    static async getConsultationMessages(sessionId: string) {
        const consultation = await prisma.consultationSession.findUnique({
            where: { sessionId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                clinician: true
            }
        });
        if (!consultation) throw new Error('Not found');
        return {
            status: consultation.status,
            clinicianName: consultation.clinician.firstName,
            messages: consultation.messages
        };
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

