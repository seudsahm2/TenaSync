export function generateEthiopianMealPlan(goals: string[], restrictions: string[]): string[] {
  const recommendedMeals: string[] = [];

  const needsIron = goals.includes('postpartum_recovery') || goals.includes('anemia_prevention');
  const needsEnergy = goals.includes('energy_boost');
  const needsAntiInflammatory = goals.includes('spine_recovery') || goals.includes('anti_inflammatory');

  if (needsIron && !restrictions.includes('Teff')) {
    recommendedMeals.push('Teff Injera with Spinach (Gomen) - High in Iron and Calcium');
  }

  if (needsAntiInflammatory && !restrictions.includes('Flaxseed')) {
    recommendedMeals.push('Telba (Flaxseed) Drink - High in Omega-3s for joint and spine recovery');
  }

  if (needsEnergy && !restrictions.includes('Barley')) {
    recommendedMeals.push('Beso (Roasted Barley) Shake - Dense energy and fiber');
  }

  if (goals.includes('general_wellness') && !restrictions.includes('Moringa')) {
    recommendedMeals.push('Moringa Tea - Rich in antioxidants and essential vitamins');
  }

  if (recommendedMeals.length === 0) {
    recommendedMeals.push('Shiro Wot with Teff Injera (Standard balanced meal)');
  }

  return recommendedMeals;
}
