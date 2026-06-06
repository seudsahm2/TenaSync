import { prisma } from '../../../core/db/index.js';

export class NutritionService {
  static async getProfileOrCreate(userId: string) {
    let profile = await prisma.specializedProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      profile = await prisma.specializedProfile.create({
        data: { userId, nutritionActive: true }
      });
    } else if (!profile.nutritionActive) {
      profile = await prisma.specializedProfile.update({
        where: { id: profile.id },
        data: { nutritionActive: true }
      });
    }
    return profile;
  }

  static async createPlan(userId: string, data: { dietaryGoals: string[], assignedMeals: string[], restrictions: string[], isActive?: boolean }) {
    const profile = await this.getProfileOrCreate(userId);
    
    // Disable previous active plans
    await prisma.nutritionPlan.updateMany({
      where: { profileId: profile.id, isActive: true },
      data: { isActive: false }
    });

    const { generateEthiopianMealPlan } = await import('../utils/nutrition-mapper.js');
    
    // If assignedMeals wasn't explicitly provided, generate it based on goals and restrictions
    const assignedMeals = data.assignedMeals.length > 0 
      ? data.assignedMeals 
      : generateEthiopianMealPlan(data.dietaryGoals, data.restrictions);

    return await prisma.nutritionPlan.create({
      data: {
        profileId: profile.id,
        isActive: data.isActive ?? true,
        dietaryGoals: data.dietaryGoals,
        restrictions: data.restrictions,
        assignedMeals: assignedMeals
      }
    });
  }

  static async getActivePlan(userId: string) {
    const profile = await this.getProfileOrCreate(userId);
    return await prisma.nutritionPlan.findFirst({
      where: { profileId: profile.id, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
