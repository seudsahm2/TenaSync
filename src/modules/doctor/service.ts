// Business logic for Doctor Module

import { PrismaClient, Role, ConsultationStatus } from '@prisma/client';
import {
    DoctorProfile,
    DoctorStats,
    PatientInfo,
    ConsultationInfo,
    ConsultationDetail,
    DocumentInfo,
    UpdateProfileRequest,
    SendMessageRequest,
    UpdateConsultationStatusRequest,
    UploadDocumentRequest,
    VerificationRequest
} from './types.js';

const prisma = new PrismaClient();

export interface AvailabilityRequest {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
}

export class DoctorService {

    // ==================== PROFILE MANAGEMENT ====================

    /**
     * Get doctor profile by ID
     */
    async getDoctorProfile(doctorId: string): Promise<DoctorProfile | null> {
        const doctor = await prisma.user.findUnique({
            where: {
                id: doctorId,
                role: Role.CLINICIAN
            }
        });

        if (!doctor) return null;

        return {
            ...doctor,
            username: doctor.username || undefined,
            specialty: doctor.specialty || undefined
        };
    }

    /**
     * Update doctor profile
     */
    async updateDoctorProfile(
        doctorId: string,
        data: UpdateProfileRequest
    ): Promise<DoctorProfile> {
        const updated = await prisma.user.update({
            where: { id: doctorId },
            data: {
                specialty: data.specialty,
                treatmentOptions: data.treatmentOptions
            }
        });

        return {
            ...updated,
            username: updated.username || undefined,
            specialty: updated.specialty || undefined
        };
    }

    /**
     * Get doctor statistics
     */
    async getDoctorStats(doctorId: string): Promise<DoctorStats> {
        const consultations = await prisma.consultationSession.findMany({
            where: { clinicianId: doctorId }
        });

        const uniquePatients = new Set(consultations.map(c => c.patientId));
        const activeConsultations = consultations.filter(
            c => c.status === ConsultationStatus.ACTIVE
        );
        const completedConsultations = consultations.filter(
            c => c.status === ConsultationStatus.COMPLETED
        );

        return {
            totalPatients: uniquePatients.size,
            activeConsultations: activeConsultations.length,
            completedConsultations: completedConsultations.length,
            totalConsultations: consultations.length
        };
    }

    /**
     * Verify a user as a clinician
     */
    async verifyDoctor(
        userId: string,
        verificationData: VerificationRequest
    ): Promise<DoctorProfile> {
        const verified = await prisma.user.update({
            where: { id: userId },
            data: {
                role: Role.CLINICIAN,
                isVerifiedClinician: true,
                specialty: verificationData.specialty,
                treatmentOptions: verificationData.treatmentOptions
            }
        });

        return {
            ...verified,
            username: verified.username || undefined,
            specialty: verified.specialty || undefined
        };
    }

    // ==================== PATIENT MANAGEMENT ====================

    /**
     * Get all patients assigned to this doctor
     */
    async getDoctorPatients(doctorId: string): Promise<PatientInfo[]> {
        const consultations = await prisma.consultationSession.findMany({
            where: { clinicianId: doctorId },
            include: { patient: true },
            orderBy: { createdAt: 'desc' }
        });

        // Get unique patients
        const patientMap = new Map<string, PatientInfo>();

        for (const consultation of consultations) {
            if (!patientMap.has(consultation.patient.id)) {
                patientMap.set(consultation.patient.id, {
                    id: consultation.patient.id,
                    telegramId: consultation.patient.telegramId,
                    username: consultation.patient.username || undefined,
                    firstName: consultation.patient.firstName,
                    postureStrainIndex: consultation.patient.postureStrainIndex,
                    postpartumDay: consultation.patient.postpartumDay || undefined,
                    hypertensionFlag: consultation.patient.hypertensionFlag,
                    lastConsultation: consultation.createdAt
                });
            }
        }

        return Array.from(patientMap.values());
    }

    /**
     * Get specific patient details
     */
    async getPatientDetails(
        doctorId: string,
        patientId: string
    ): Promise<PatientInfo | null> {
        // Verify doctor has access to this patient
        const consultation = await prisma.consultationSession.findFirst({
            where: {
                clinicianId: doctorId,
                patientId: patientId
            },
            include: { patient: true }
        });

        if (!consultation) {
            return null;
        }

        return {
            id: consultation.patient.id,
            telegramId: consultation.patient.telegramId,
            username: consultation.patient.username || undefined,
            firstName: consultation.patient.firstName,
            postureStrainIndex: consultation.patient.postureStrainIndex,
            postpartumDay: consultation.patient.postpartumDay || undefined,
            hypertensionFlag: consultation.patient.hypertensionFlag
        };
    }

    /**
     * Get patient's consultation history
     */
    async getPatientHistory(
        doctorId: string,
        patientId: string
    ): Promise<ConsultationInfo[]> {
        const consultations = await prisma.consultationSession.findMany({
            where: {
                clinicianId: doctorId,
                patientId: patientId
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        username: true
                    }
                },
                messages: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return consultations.map(c => ({
            id: c.id,
            sessionId: c.sessionId,
            patientSymptoms: c.patientSymptoms,
            consultationType: c.consultationType || undefined,
            scheduledTime: c.scheduledTime || undefined,
            status: c.status,
            autoReplyEnabled: c.autoReplyEnabled,
            patient: {
                id: c.patient.id,
                firstName: c.patient.firstName,
                username: c.patient.username || undefined
            },
            messageCount: c.messages.length,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));
    }

    // ==================== CONSULTATION MANAGEMENT ====================

    /**
     * Get all consultations for a doctor
     */
    async getDoctorConsultations(
        doctorId: string,
        status?: ConsultationStatus
    ): Promise<ConsultationInfo[]> {
        const where: any = { clinicianId: doctorId };
        if (status) {
            where.status = status;
        }

        const consultations = await prisma.consultationSession.findMany({
            where,
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        username: true
                    }
                },
                messages: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        return consultations.map(c => ({
            id: c.id,
            sessionId: c.sessionId,
            patientSymptoms: c.patientSymptoms,
            consultationType: c.consultationType || undefined,
            scheduledTime: c.scheduledTime || undefined,
            status: c.status,
            autoReplyEnabled: c.autoReplyEnabled,
            patient: {
                id: c.patient.id,
                firstName: c.patient.firstName,
                username: c.patient.username || undefined
            },
            messageCount: c.messages.length,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));
    }

    /**
     * Get consultation details with messages
     */
    async getConsultationDetails(
        doctorId: string,
        sessionId: string
    ): Promise<ConsultationDetail | null> {
        const consultation = await prisma.consultationSession.findFirst({
            where: {
                sessionId: sessionId,
                clinicianId: doctorId
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        username: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!consultation) {
            return null;
        }

        return {
            id: consultation.id,
            sessionId: consultation.sessionId,
            patientSymptoms: consultation.patientSymptoms,
            consultationType: consultation.consultationType || undefined,
            scheduledTime: consultation.scheduledTime || undefined,
            status: consultation.status,
            autoReplyEnabled: consultation.autoReplyEnabled,
            patient: {
                id: consultation.patient.id,
                firstName: consultation.patient.firstName,
                username: consultation.patient.username || undefined
            },
            messageCount: consultation.messages.length,
            messages: consultation.messages.map(m => ({
                id: m.id,
                sender: m.sender,
                text: m.text,
                telegramMessageId: m.telegramMessageId || undefined,
                createdAt: m.createdAt
            })),
            lastManualActive: consultation.lastManualActive || undefined,
            createdAt: consultation.createdAt,
            updatedAt: consultation.updatedAt
        };
    }

    /**
     * Manual takeover - disable AI and enable human doctor
     */
    async takeoverConsultation(
        doctorId: string,
        sessionId: string
    ): Promise<ConsultationDetail | null> {
        const consultation = await prisma.consultationSession.findFirst({
            where: {
                sessionId: sessionId,
                clinicianId: doctorId
            }
        });

        if (!consultation) {
            return null;
        }

        const updated = await prisma.consultationSession.update({
            where: { id: consultation.id },
            data: {
                autoReplyEnabled: false,
                lastManualActive: new Date(),
                status: ConsultationStatus.MANUAL_TAKEOVER
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        username: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        return {
            id: updated.id,
            sessionId: updated.sessionId,
            patientSymptoms: updated.patientSymptoms,
            consultationType: updated.consultationType || undefined,
            scheduledTime: updated.scheduledTime || undefined,
            status: updated.status,
            autoReplyEnabled: updated.autoReplyEnabled,
            patient: {
                id: updated.patient.id,
                firstName: updated.patient.firstName,
                username: updated.patient.username || undefined
            },
            messageCount: updated.messages.length,
            messages: updated.messages.map(m => ({
                id: m.id,
                sender: m.sender,
                text: m.text,
                telegramMessageId: m.telegramMessageId || undefined,
                createdAt: m.createdAt
            })),
            lastManualActive: updated.lastManualActive || undefined,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt
        };
    }

    /**
     * Send message to patient in consultation
     */
    async sendMessage(
        doctorId: string,
        sessionId: string,
        messageData: SendMessageRequest
    ): Promise<void> {
        const consultation = await prisma.consultationSession.findFirst({
            where: {
                sessionId: sessionId,
                clinicianId: doctorId
            }
        });

        if (!consultation) {
            throw new Error('Consultation not found');
        }

        await prisma.consultationMessage.create({
            data: {
                consultationId: consultation.id,
                sender: Role.CLINICIAN,
                text: messageData.text
            }
        });

        // Update consultation timestamp
        await prisma.consultationSession.update({
            where: { id: consultation.id },
            data: { updatedAt: new Date() }
        });
    }

    /**
     * Update consultation status
     */
    async updateConsultationStatus(
        doctorId: string,
        sessionId: string,
        statusData: UpdateConsultationStatusRequest
    ): Promise<ConsultationDetail | null> {
        const consultation = await prisma.consultationSession.findFirst({
            where: {
                sessionId: sessionId,
                clinicianId: doctorId
            }
        });

        if (!consultation) {
            return null;
        }

        const updated = await prisma.consultationSession.update({
            where: { id: consultation.id },
            data: { status: statusData.status },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        username: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        return {
            id: updated.id,
            sessionId: updated.sessionId,
            patientSymptoms: updated.patientSymptoms,
            consultationType: updated.consultationType || undefined,
            scheduledTime: updated.scheduledTime || undefined,
            status: updated.status,
            autoReplyEnabled: updated.autoReplyEnabled,
            patient: {
                id: updated.patient.id,
                firstName: updated.patient.firstName,
                username: updated.patient.username || undefined
            },
            messageCount: updated.messages.length,
            messages: updated.messages.map(m => ({
                id: m.id,
                sender: m.sender,
                text: m.text,
                telegramMessageId: m.telegramMessageId || undefined,
                createdAt: m.createdAt
            })),
            lastManualActive: updated.lastManualActive || undefined,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt
        };
    }

    // ==================== AVAILABILITY MANAGEMENT ====================

    /**
     * Add or update an availability slot
     */
    async setAvailability(
        doctorId: string,
        data: AvailabilityRequest
    ): Promise<any> {
        // @ts-ignore
        return await prisma.doctorAvailability.create({
            data: {
                clinicianId: doctorId,
                dayOfWeek: data.dayOfWeek,
                startTime: data.startTime,
                endTime: data.endTime,
                isAvailable: data.isAvailable
            }
        });
    }

    /**
     * Get doctor's availability
     */
    async getAvailability(doctorId: string): Promise<any[]> {
        // @ts-ignore
        return await prisma.doctorAvailability.findMany({
            where: { clinicianId: doctorId },
            orderBy: { dayOfWeek: 'asc' }
        });
    }

    /**
     * Delete an availability slot
     */
    async deleteAvailability(doctorId: string, slotId: string): Promise<boolean> {
        try {
            // @ts-ignore
            await prisma.doctorAvailability.delete({
                where: {
                    id: slotId,
                    clinicianId: doctorId
                }
            });
            return true;
        } catch {
            return false;
        }
    }

    // ==================== DOCUMENT MANAGEMENT ====================

    /**
     * Upload a medical document/guideline
     */
    async uploadDocument(
        doctorId: string,
        documentData: UploadDocumentRequest
    ): Promise<DocumentInfo> {
        const document = await prisma.clinicianDocument.create({
            data: {
                title: documentData.title,
                content: documentData.content,
                userId: doctorId
            }
        });

        return document;
    }

    /**
     * Get all documents for a doctor
     */
    async getDoctorDocuments(doctorId: string): Promise<DocumentInfo[]> {
        const documents = await prisma.clinicianDocument.findMany({
            where: { userId: doctorId },
            orderBy: { createdAt: 'desc' }
        });

        return documents;
    }

    /**
     * Delete a document
     */
    async deleteDocument(
        doctorId: string,
        documentId: string
    ): Promise<boolean> {
        try {
            await prisma.clinicianDocument.delete({
                where: {
                    id: documentId,
                    userId: doctorId
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}

export const doctorService = new DoctorService();
