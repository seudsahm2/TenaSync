// Utility functions for Doctor Module

import { ConsultationStatus } from '@prisma/client';

/**
 * Format consultation status for display
 */
export const formatConsultationStatus = (status: ConsultationStatus): string => {
    const statusMap: Record<ConsultationStatus, string> = {
        [ConsultationStatus.ACTIVE]: 'Active',
        [ConsultationStatus.COMPLETED]: 'Completed',
        [ConsultationStatus.MANUAL_TAKEOVER]: 'Manual Takeover',
        [ConsultationStatus.CANCELLED]: 'Cancelled'
    };
    return statusMap[status] || status;
};

/**
 * Check if a consultation is active
 */
export const isConsultationActive = (status: ConsultationStatus): boolean => {
    return status === ConsultationStatus.ACTIVE || status === ConsultationStatus.MANUAL_TAKEOVER;
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

/**
 * Calculate time since last activity
 */
export const getTimeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    const intervals: Record<string, number> = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
};

/**
 * Sanitize text input
 */
export const sanitizeText = (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
};

/**
 * Generate a summary of patient symptoms
 */
export const summarizeSymptoms = (symptoms: string, maxLength: number = 100): string => {
    const sanitized = sanitizeText(symptoms);
    if (sanitized.length <= maxLength) {
        return sanitized;
    }
    return sanitized.substring(0, maxLength - 3) + '...';
};

/**
 * Check if doctor can take over consultation
 */
export const canTakeoverConsultation = (
    status: ConsultationStatus,
    autoReplyEnabled: boolean
): boolean => {
    return status === ConsultationStatus.ACTIVE && autoReplyEnabled;
};

/**
 * Format treatment options for display
 */
export const formatTreatmentOptions = (options: string[]): string => {
    if (options.length === 0) return 'None specified';
    if (options.length === 1) return options[0];
    if (options.length === 2) return options.join(' and ');
    return options.slice(0, -1).join(', ') + ', and ' + options[options.length - 1];
};

/**
 * Extract error message from unknown error
 */
export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
};

/**
 * Check if a value is a valid UUID
 */
export const isValidUUID = (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};
