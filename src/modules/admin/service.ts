import { prisma } from '../../core/db/index.js';
import { Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'admin_config.json');

export class AdminService {
  /**
   * Check if Admin Registration is Open
   */
  static async isRegistrationOpen() {
    // If no admins exist at all, it's always open (first-time setup)
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount === 0) return true;

    // Otherwise, check the config file
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify({ isOpen: false }));
      return false;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.isOpen === true;
  }

  /**
   * Toggle Admin Registration
   */
  static async toggleRegistration(isOpen: boolean) {
    fs.writeFileSync(configPath, JSON.stringify({ isOpen }));
    return isOpen;
  }

  /**
   * Register an Admin
   */
  static async registerAdmin(telegramId: string, firstName: string, username: string) {
    const isOpen = await this.isRegistrationOpen();
    if (!isOpen) throw new Error("Admin registration is currently closed.");

    let isLocal = telegramId.toString().startsWith('test');
    let tId = isLocal ? BigInt(Math.floor(Math.random() * 1000000)) : BigInt(telegramId);
    
    let user = null;
    try {
      user = await prisma.user.findUnique({ where: { telegramId: tId } });
    } catch (e) {
      // ignore
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: tId,
          firstName: firstName,
          username: username,
          role: Role.ADMIN
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: Role.ADMIN }
      });
    }

    // Auto-close registration after successful registration
    await this.toggleRegistration(false);
    return user;
  }
  /**
   * Get all pending doctor applications
   */
  static async getPendingDoctors() {
    return prisma.user.findMany({
      where: {
        role: Role.CLINICIAN,
        isVerifiedClinician: false
      },
      include: {
        documents: true // To see their uploaded medical license/ID
      }
    });
  }

  /**
   * Approve a doctor application
   */
  static async approveDoctor(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isVerifiedClinician: true }
    });
  }

  /**
   * Reject a doctor application
   */
  static async rejectDoctor(userId: string) {
    // We can either delete the user or revert them to a PATIENT role
    return prisma.user.update({
      where: { id: userId },
      data: { 
        role: Role.PATIENT,
        isVerifiedClinician: false,
        specialty: null
      }
    });
  }
}
