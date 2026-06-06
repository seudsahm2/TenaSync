// Specialized Module Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const autostart = urlParams.get('tab') || 'spine';

  const tabs = [
    { id: 'spine', element: document.getElementById('tab-spine'), nav: document.getElementById('nav-tab-spine') },
    { id: 'maternal', element: document.getElementById('tab-maternal'), nav: document.getElementById('nav-tab-maternal') },
    { id: 'nutrition', element: document.getElementById('tab-nutrition'), nav: document.getElementById('nav-tab-nutrition') }
  ];

  function switchTab(targetTabId) {
    tabs.forEach(tab => {
      if (tab.id === targetTabId) {
        tab.element.classList.add('active');
        tab.nav.classList.add('active');
      } else {
        tab.element.classList.remove('active');
        tab.nav.classList.remove('active');
      }
    });
  }

  tabs.forEach(tab => {
    tab.nav.addEventListener('click', () => switchTab(tab.id));
  });

  if (autostart) switchTab(autostart);

  // ==================== SPINE STRESS CALCULATOR ====================
  const inputHours = document.getElementById('input-hours');
  const inputTension = document.getElementById('input-tension');
  const hoursValLabel = document.getElementById('hours-val-label');
  const tensionValLabel = document.getElementById('tension-val-label');
  
  const spineVisualBox = document.getElementById('spine-visual-box');
  const spineStateBadge = document.getElementById('spine-state-badge');
  const stressScoreText = document.getElementById('stress-score-text');
  const stressLevelText = document.getElementById('stress-level-text');
  const stressRecText = document.getElementById('stress-recommendation-text');

  function updateSpineSimulator() {
    const hSedentary = parseFloat(inputHours.value);
    const sIndex = parseInt(inputTension.value, 10);
    
    hoursValLabel.textContent = `${hSedentary} hrs`;
    tensionValLabel.textContent = sIndex.toString();

    const tSpine = Math.min(100, Math.round((hSedentary * 6.5) + (sIndex * 4.0)));
    stressScoreText.textContent = tSpine.toString();

    spineVisualBox.className = 'spine-display';
    
    if (tSpine < 40) {
      spineVisualBox.classList.add('state-green');
      stressLevelText.textContent = 'Low tension';
      stressLevelText.style.color = '#10B981';
      stressRecText.textContent = 'Recommend passive stretching, deep diaphragmatic breaths, and a standard 10° back-extension.';
    } else if (tSpine < 75) {
      spineVisualBox.classList.add('state-amber');
      stressLevelText.textContent = 'Moderate strain';
      stressLevelText.style.color = '#F59E0B';
      stressRecText.textContent = 'Auto-generate a somatic core alignment routine. Highlighting C4-C5 and L4-L5 vertebral joint strain.';
    } else {
      spineVisualBox.classList.add('state-red');
      stressLevelText.textContent = 'Critical Spasm';
      stressLevelText.style.color = '#EF4444';
      stressRecText.textContent = 'Flashing Red Alert: Critical spasm state. Triggering prioritized double-blind referral routing to secure physical therapy consultations.';
    }
  }

  inputHours.addEventListener('input', updateSpineSimulator);
  inputTension.addEventListener('input', updateSpineSimulator);
  updateSpineSimulator();

  // ==================== MATERNAL HEALTH TRACKER ====================
  const inputPostpartumDay = document.getElementById('input-postpartum-day');
  const maternalDaysText = document.getElementById('maternal-days-text');
  const pelvicPainText = document.getElementById('pelvic-pain-text');
  const inputPelvicPain = document.getElementById('input-pelvic-pain');

  inputPostpartumDay.addEventListener('input', () => {
    maternalDaysText.textContent = `Day ${inputPostpartumDay.value}`;
  });

  inputPelvicPain.addEventListener('change', () => {
    const painLevel = inputPelvicPain.value;
    if (painLevel === 'low') {
      pelvicPainText.textContent = 'Mild';
      pelvicPainText.style.color = '#10B981';
    } else if (painLevel === 'moderate') {
      pelvicPainText.textContent = 'Moderate';
      pelvicPainText.style.color = '#F59E0B';
    } else {
      pelvicPainText.textContent = 'Severe';
      pelvicPainText.style.color = '#EF4444';
    }
  });

  document.getElementById('btn-maternal-booking').addEventListener('click', async () => {
    alert("Anonymous referral dispatched! Please check your Telegram DMs.");
  });

  document.getElementById('btn-spine-booking').addEventListener('click', () => {
    alert("Booking therapist...");
  });

  // ==================== ANCESTRAL NUTRITION COMPILER ====================
  const nutritionGridBox = document.getElementById('nutrition-grid-box');
  
  const ANCESTRAL_MAPPINGS = {
    hypertension: {
      title: 'Hypertension (Elevated BP)',
      grain: 'Barley ገንፎ (Genfo)',
      botanical: 'Moringa (Shiferaw) Tea',
      mechanism: 'High potassium density; acts as organic vasodilator.',
      avoid: 'Excess clarified spiced butter (Kibe), refined salts.'
    },
    diabetes: {
      title: 'Type 2 Diabetes',
      grain: 'Grade A Teff Injera',
      botanical: 'Flaxseed (Telba) Shake',
      mechanism: 'Low glycemic index; slows glucose absorption.',
      avoid: 'Processed wheat flour, white table sugar.'
    },
    postpartum: {
      title: 'Postpartum Recovery / Lactation',
      grain: 'Beso (Beso) Barley',
      botanical: 'Fenugreek (Abish) infusion',
      mechanism: 'Rebuilds red blood cells; galactagogue.',
      avoid: 'Dehydrating caffeine drinks, cold beverages.'
    }
  };

  function renderNutritionCompiler() {
    nutritionGridBox.innerHTML = '';
    Object.keys(ANCESTRAL_MAPPINGS).forEach(key => {
      const item = ANCESTRAL_MAPPINGS[key];
      const card = document.createElement('div');
      card.className = 'nutrition-card';
      card.innerHTML = `
        <div style="font-weight:bold; margin-bottom:10px;">${item.title}</div>
        <div style="font-size:12px; margin-bottom:5px;"><strong>Staple Grain:</strong> ${item.grain}</div>
        <div style="font-size:12px; margin-bottom:5px;"><strong>Botanical:</strong> ${item.botanical}</div>
        <div style="font-size:12px; color:#10B981; margin-bottom:5px;"><strong>Mechanism:</strong> ${item.mechanism}</div>
        <div style="font-size:12px; color:#EF4444;"><strong>Avoid:</strong> ${item.avoid}</div>
      `;
      nutritionGridBox.appendChild(card);
    });
  }
  renderNutritionCompiler();
});