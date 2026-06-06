// TypeScript interfaces for Doctor Module

import { Role, ConsultationStatus } from '@prisma/client';

export interface DoctorProfile {
    id: string;
    telegramId: bigint;
    username?: string;
    firstName: string;
    role: Role;
    isVerifiedClinician: boolean;
    specialty?: string;
    treatmentOptions: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface DoctorStats {
    totalPatients: number;
    activeConsultations: number;
    completedConsultations: number;
    totalConsultations: number;
}

export interface PatientInfo {
    id: string;
    telegramId: bigint;
    username?: string;
    firstName: string;
    postureStrainIndex: number;
    postpartumDay?: number;
    hypertensionFlag: boolean;
    lastConsultation?: Date;
}

export interface ConsultationInfo {
    id: string;
    sessionId: string;
    patientSymptoms: string;
    consultationType?: string;
    scheduledTime?: Date;
    status: ConsultationStatus;
    autoReplyEnabled: boolean;
    patient: {
        id: string;
        firstName: string;
        username?: string;
    };
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConsultationDetail extends ConsultationInfo {
    messages: ConsultationMessageInfo[];
    lastManualActive?: Date;
}

export interface ConsultationMessageInfo {
    id: string;
    sender: Role;
    text: string;
    telegramMessageId?: number;
    createdAt: Date;
}

export interface AvailabilitySlot {
    id: string;
    doctorId: string;
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:mm format
    endTime: string;
    isAvailable: boolean;
}

export interface DocumentInfo {
    id: string;
    title: string;
    content: string;
    userId: string;
    createdAt: Date;
}

// Request/Response DTOs
export interface UpdateProfileRequest {
    specialty?: string;
    treatmentOptions?: string[];
}

export interface CreateAvailabilityRequest {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

export interface SendMessageRequest {
    text: string;
}

export interface UpdateConsultationStatusRequest {
    status: ConsultationStatus;
}

export interface UploadDocumentRequest {
    title: string;
    content: string;
}

export interface VerificationRequest {
    specialty: string;
    treatmentOptions: string[];
    credentials?: string; // Could be file path or credential info
}
