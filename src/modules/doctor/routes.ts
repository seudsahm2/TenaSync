import { Router } from 'express';
import { doctorService } from './service.js';
import {
  validateUpdateProfileData,
  validateVerificationData,
  validateMessageData,
  validateConsultationStatus,
  validateDocumentData,
  ValidationError
} from './validation.js';
import { getErrorMessage } from './utils.js';
import { ConsultationStatus } from '@prisma/client';

const router = Router();

// Middleware to mock authentication for testing
// In a real app, this would use JWT or session
const mockAuth = (req: any, res: any, next: any) => {
  // We'll pass the doctor ID in the headers for testing
  const doctorId = req.headers['x-doctor-id'];
  if (doctorId) {
    (req as any).user = { id: doctorId };
  }
  next();
};

router.use(mockAuth);

// ==================== PROFILE ROUTES ====================

// Get doctor profile
router.get('/profile/:id', async (req, res) => {
  try {
    const profile = await doctorService.getDoctorProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Doctor not found or not verified' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Update doctor profile
router.put('/profile/:id', async (req, res) => {
  try {
    // Simple auth check
    const user = (req as any).user;
    if (user?.id !== req.params.id && req.headers['x-admin'] !== 'true') {
      return res.status(403).json({ error: 'Unauthorized to update this profile' });
    }

    validateUpdateProfileData(req.body);
    const updated = await doctorService.updateDoctorProfile(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get doctor stats
router.get('/profile/:id/stats', async (req, res) => {
  try {
    const stats = await doctorService.getDoctorStats(req.params.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Verify doctor (Admin endpoint or onboarding)
router.post('/verify/:userId', async (req, res) => {
  try {
    validateVerificationData(req.body);
    const verified = await doctorService.verifyDoctor(req.params.userId, req.body);
    res.json(verified);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// ==================== PATIENT ROUTES ====================

// List all patients for a doctor
router.get('/patients', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized. Provide x-doctor-id header' });
    }

    const patients = await doctorService.getDoctorPatients(doctorId);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get specific patient details
router.get('/patients/:patientId', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const patient = await doctorService.getPatientDetails(doctorId, req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or not assigned to you' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get patient history
router.get('/patients/:patientId/history', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const history = await doctorService.getPatientHistory(doctorId, req.params.patientId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// ==================== CONSULTATION ROUTES ====================

// List active consultations
router.get('/consultations', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const statusStr = req.query.status as string;
    let statusFilter: ConsultationStatus | undefined;

    if (statusStr) {
      validateConsultationStatus(statusStr);
      statusFilter = statusStr as ConsultationStatus;
    }

    const consultations = await doctorService.getDoctorConsultations(doctorId, statusFilter);
    res.json(consultations);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get consultation details with messages
router.get('/consultations/:sessionId', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const consultation = await doctorService.getConsultationDetails(doctorId, req.params.sessionId);
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found or not assigned to you' });
    }
    res.json(consultation);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Manual takeover from AI
router.post('/consultations/:sessionId/takeover', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const consultation = await doctorService.takeoverConsultation(doctorId, req.params.sessionId);
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }
    res.json(consultation);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Send message to patient
router.post('/consultations/:sessionId/message', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    validateMessageData(req.body);
    await doctorService.sendMessage(doctorId, req.params.sessionId, req.body);
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Update consultation status
router.put('/consultations/:sessionId/status', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    validateConsultationStatus(req.body.status);
    const updated = await doctorService.updateConsultationStatus(
      doctorId,
      req.params.sessionId,
      { status: req.body.status as ConsultationStatus }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Consultation not found' });
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// ==================== AVAILABILITY ROUTES ====================

// Set availability slot
router.post('/availability', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { dayOfWeek, startTime, endTime, isAvailable } = req.body;
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required availability fields' });
    }

    const slot = await doctorService.setAvailability(doctorId, {
      dayOfWeek,
      startTime,
      endTime,
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get availability slots
router.get('/availability/:doctorId', async (req, res) => {
  try {
    const slots = await doctorService.getAvailability(req.params.doctorId);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Delete availability slot
router.delete('/availability/:slotId', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const success = await doctorService.deleteAvailability(doctorId, req.params.slotId);
    if (!success) {
      return res.status(404).json({ error: 'Slot not found or unauthorized' });
    }
    res.json({ success: true, message: 'Slot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// ==================== DOCUMENT ROUTES ====================

// List documents
router.get('/documents', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documents = await doctorService.getDoctorDocuments(doctorId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Upload document
router.post('/documents', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    validateDocumentData(req.body);
    const document = await doctorService.uploadDocument(doctorId, req.body);
    res.status(201).json(document);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Delete document
router.delete('/documents/:docId', async (req, res) => {
  try {
    const doctorId = (req as any).user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const success = await doctorService.deleteDocument(doctorId, req.params.docId);
    if (!success) {
      return res.status(404).json({ error: 'Document not found or you do not have permission to delete it' });
    }
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

export default router;