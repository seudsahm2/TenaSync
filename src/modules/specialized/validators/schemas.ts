import { z } from 'zod';

export const SpineAssessmentSchema = z.object({
  painLevel: z.number().min(1).max(10),
  hoursSeated: z.number().min(0),
  postureScore: z.number().optional(),
  notes: z.string().optional(),
});

export const MaternalLogSchema = z.object({
  postpartumWeek: z.number().min(1),
  painLevel: z.number().min(1).max(10),
  mood: z.string().optional(),
  pelvicRecovery: z.string().optional(),
});

export const NutritionPlanSchema = z.object({
  dietaryGoals: z.array(z.string()),
  assignedMeals: z.array(z.string()),
  restrictions: z.array(z.string()),
  isActive: z.boolean().optional(),
});

export const SpecializedProfileSchema = z.object({
  spineActive: z.boolean().optional(),
  maternalActive: z.boolean().optional(),
  nutritionActive: z.boolean().optional(),
});
