export function calculateSpineRisk(painLevel: number, hoursSeated: number): { score: number, riskLevel: string, stretches: string[] } {
  // Simple algorithm:
  // Pain max 10, Seated max 16. Total score out of 100.
  // Weight: Pain 60%, Seated 40%
  const painScore = (painLevel / 10) * 60;
  const seatedScore = (Math.min(hoursSeated, 16) / 16) * 40;
  
  const score = Math.round(painScore + seatedScore);
  
  let riskLevel = 'LOW';
  let stretches = ['Basic Neck Rolls', 'Shoulder Shrugs'];

  if (score > 70) {
    riskLevel = 'HIGH';
    stretches = ['Cobra Pose', 'Childs Pose', 'Cat-Cow Stretch', 'Thoracic Extension'];
  } else if (score > 40) {
    riskLevel = 'MEDIUM';
    stretches = ['Seated Spinal Twist', 'Chest Opener', 'Cat-Cow Stretch'];
  }

  return { score, riskLevel, stretches };
}

export function analyzeMaternalRecovery(postpartumWeek: number, painLevel: number, mood: string): { status: string, alerts: string[] } {
  const alerts: string[] = [];
  let status = 'ON_TRACK';

  if (postpartumWeek <= 2 && painLevel > 7) {
    alerts.push('High pain detected early postpartum. Consider contacting a clinician.');
    status = 'ATTENTION_NEEDED';
  } else if (postpartumWeek > 6 && painLevel > 4) {
    alerts.push('Persistent pain after week 6. Pelvic floor evaluation recommended.');
    status = 'ATTENTION_NEEDED';
  }

  const lowMoods = ['Anxious', 'Depressed', 'Sad', 'Overwhelmed'];
  if (lowMoods.includes(mood)) {
    alerts.push('Mood indicates possible postpartum blues or depression. Please use the AI Assistant for support or contact a clinician.');
    status = 'ATTENTION_NEEDED';
  }

  return { status, alerts };
}
