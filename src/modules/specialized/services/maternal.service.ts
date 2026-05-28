import { prisma } from '../../../core/db/index.js';

export class MaternalService {
  static async getProfileOrCreate(userId: string) {
    let profile = await prisma.specializedProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      profile = await prisma.specializedProfile.create({
        data: { userId, maternalActive: true }
      });
    } else if (!profile.maternalActive) {
      profile = await prisma.specializedProfile.update({
        where: { id: profile.id },
        data: { maternalActive: true }
      });
    }
    return profile;
  }

  static async logStatus(userId: string, data: { postpartumWeek: number, painLevel: number, mood?: string, pelvicRecovery?: string }) {
    const profile = await this.getProfileOrCreate(userId);
    
    const { analyzeMaternalRecovery } = await import('../utils/risk-calculators.js');
    const recoveryAnalysis = analyzeMaternalRecovery(data.postpartumWeek, data.painLevel, data.mood || 'Okay');
    
    return await prisma.maternalLog.create({
      data: {
        profileId: profile.id,
        postpartumWeek: data.postpartumWeek,
        painLevel: data.painLevel,
        mood: data.mood,
        pelvicRecovery: data.pelvicRecovery,
        // we could store the alerts into a notes or similar JSON field if the schema allowed it, 
        // for now we just return the analysis to the controller
      }
    });
  }

  static async getLogs(userId: string) {
    const profile = await this.getProfileOrCreate(userId);
    return await prisma.maternalLog.findMany({
      where: { profileId: profile.id },
      orderBy: { logDate: 'desc' }
    });
  }
}
