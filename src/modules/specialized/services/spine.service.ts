import { prisma } from '../../../core/db/index.js';

export class SpineService {
  static async getProfileOrCreate(userId: string) {
    let profile = await prisma.specializedProfile.findUnique({
      where: { userId }
    });
    if (!profile) {
      profile = await prisma.specializedProfile.create({
        data: { userId, spineActive: true }
      });
    } else if (!profile.spineActive) {
      profile = await prisma.specializedProfile.update({
        where: { id: profile.id },
        data: { spineActive: true }
      });
    }
    return profile;
  }

  static async logAssessment(userId: string, data: { painLevel: number, hoursSeated: number, postureScore?: number, notes?: string }) {
    const profile = await this.getProfileOrCreate(userId);
    
    // Import dynamically to avoid circular dependencies if any, or just import at top
    const { calculateSpineRisk } = await import('../utils/risk-calculators.js');
    
    const riskAnalysis = calculateSpineRisk(data.painLevel, data.hoursSeated);
    
    // Determine posture score if not provided
    const postureScore = data.postureScore ?? riskAnalysis.score;

    return await prisma.spineAssessment.create({
      data: {
        profileId: profile.id,
        painLevel: data.painLevel,
        hoursSeated: data.hoursSeated,
        postureScore: postureScore,
        notes: JSON.stringify({
          userNotes: data.notes,
          riskLevel: riskAnalysis.riskLevel,
          stretches: riskAnalysis.stretches
        })
      }
    });
  }

  static async getAssessments(userId: string) {
    const profile = await this.getProfileOrCreate(userId);
    return await prisma.spineAssessment.findMany({
      where: { profileId: profile.id },
      orderBy: { assessmentDate: 'desc' }
    });
  }
}
