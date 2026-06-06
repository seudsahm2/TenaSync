import { Router } from 'express';

const router = Router();

// Seud's Module: Doctor/Specialist
// Core Focus: Doctor verification, Professional profile, Availability management, Appointment management, Patient list.

router.get('/profile/:id', async (req, res) => {
  // TODO: Seud to implement doctor profile fetching
  res.json({ message: "Doctor profile route" });
});

router.get('/patients', async (req, res) => {
  // TODO: Seud to implement patient list fetching
  res.json({ message: "Doctor's patient list route" });
});

export default router;
