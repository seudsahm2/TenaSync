// Input validation for Doctor Module

import { ConsultationStatus } from '@prisma/client';

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export const validateDoctorId = (id: string): void => {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ValidationError('Invalid doctor ID');
    }
};

export const validatePatientId = (id: string): void => {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ValidationError('Invalid patient ID');
    }
};

export const validateSessionId = (id: string): void => {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new ValidationError('Invalid session ID');
    }
};

export const validateUpdateProfileData = (data: any): void => {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid profile data');
    }

    if (data.specialty && typeof data.specialty !== 'string') {
        throw new ValidationError('Specialty must be a string');
    }

    if (data.treatmentOptions) {
        if (!Array.isArray(data.treatmentOptions)) {
            throw new ValidationError('Treatment options must be an array');
        }
        if (!data.treatmentOptions.every((opt: any) => typeof opt === 'string')) {
            throw new ValidationError('All treatment options must be strings');
        }
    }
};

export const validateVerificationData = (data: any): void => {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid verification data');
    }

    if (!data.specialty || typeof data.specialty !== 'string') {
        throw new ValidationError('Specialty is required and must be a string');
    }

    if (!data.treatmentOptions || !Array.isArray(data.treatmentOptions)) {
        throw new ValidationError('Treatment options are required and must be an array');
    }

    if (data.treatmentOptions.length === 0) {
        throw new ValidationError('At least one treatment option is required');
    }
};

export const validateMessageData = (data: any): void => {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid message data');
    }

    if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
        throw new ValidationError('Message text is required and cannot be empty');
    }

    if (data.text.length > 4096) {
        throw new ValidationError('Message text cannot exceed 4096 characters');
    }
};

export const validateConsultationStatus = (status: any): void => {
    const validStatuses = Object.values(ConsultationStatus);
    if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid consultation status. Must be one of: ${validStatuses.join(', ')}`);
    }
};

export const validateDocumentData = (data: any): void => {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid document data');
    }

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        throw new ValidationError('Document title is required and cannot be empty');
    }

    if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
        throw new ValidationError('Document content is required and cannot be empty');
    }

    if (data.title.length > 255) {
        throw new ValidationError('Document title cannot exceed 255 characters');
    }
};
