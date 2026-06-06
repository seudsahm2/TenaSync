// 6.1 Biomechanical Spine Strain Algorithm
export interface SpineStrainResult {
  tensionScore: number;
  state: 'low' | 'moderate' | 'critical';
  visualColor: 'green' | 'amber' | 'red';
  focusPoints: string[];
  recommendation: string;
}

export function calculateSpineStrain(hSedentary: number, sIndex: number): SpineStrainResult {
  // T_spine = min(100, (H_sedentary * 6.5) + (S_index * 4.0))
  const tensionScore = Math.min(100, (hSedentary * 6.5) + (sIndex * 4.0));

  let state: 'low' | 'moderate' | 'critical' = 'low';
  let visualColor: 'green' | 'amber' | 'red' = 'green';
  let focusPoints: string[] = [];
  let recommendation = '';

  if (tensionScore < 40) {
    state = 'low';
    visualColor = 'green';
    recommendation = 'Recommend passive stretching, deep diaphragmatic breaths, and a standard 10° back-extension.';
  } else if (tensionScore < 75) {
    state = 'moderate';
    visualColor = 'amber';
    focusPoints = ['C4-C5', 'L4-L5'];
    recommendation = 'Auto-generate a somatic core alignment routine. Highlighting C4-C5 and L4-L5 vertebral joint strain.';
  } else {
    state = 'critical';
    visualColor = 'red';
    focusPoints = ['C4-C5', 'L4-L5', 'C3-C7', 'L4-L5 compressive stress'];
    recommendation = 'Flashing Red Alert: Critical spasm state. Triggering prioritized double-blind referral routing to secure physical therapy consultations.';
  }

  return {
    tensionScore,
    state,
    visualColor,
    focusPoints,
    recommendation
  };
}

// 6.2 Ancestral Food-Medicine Clinical Mapping
export interface NutritionRemedy {
  condition: string;
  grainBase: string;
  activeBotanical: string;
  mechanism: string;
  contraindications: string;
}

export const ANCESTRAL_NUTRITION_MAPPINGS: Record<string, NutritionRemedy> = {
  hypertension: {
    condition: 'Hypertension (Elevated BP)',
    grainBase: 'Barley ገንፎ (Genfo)',
    activeBotanical: 'Moringa (Shiferaw) Tea',
    mechanism: 'High potassium density; acts as an organic vasodilator.',
    contraindications: 'Excess clarified spiced butter (Kibe), refined salts.'
  },
  diabetes: {
    condition: 'Type 2 Diabetes',
    grainBase: 'Grade A Teff Injera',
    activeBotanical: 'Flaxseed (Telba) Shake',
    mechanism: 'Low glycemic index complex carbs; slows blood glucose absorption.',
    contraindications: 'Processed wheat flour, white table sugar.'
  },
  postpartum: {
    condition: 'Postpartum Recovery / Lactation',
    grainBase: 'Beso (Beso) Barley',
    activeBotanical: 'Fenugreek (Abish) infusion',
    mechanism: 'Rebuilds red blood cell counts; functions as a highly active galactagogue.',
    contraindications: 'Dehydrating caffeine drinks, cold beverages.'
  }
};
