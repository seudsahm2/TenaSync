// TenaSync Telegram Mini App Main Application

document.addEventListener('DOMContentLoaded', () => {
  // 1. URL Parse State Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user_id') || '999999999'; // Fallback to test patient
  const mode = urlParams.get('mode') || 'standard';
  const autostart = urlParams.get('autostart');

  console.log(`[TMA Init] User ID: ${userId}, Mode: ${mode}`);

  // Dom Elements
  const tabContentSpine = document.getElementById('tab-spine');
  const tabContentMaternal = document.getElementById('tab-maternal');
  const tabContentNutrition = document.getElementById('tab-nutrition');

  const navTabSpine = document.getElementById('nav-tab-spine');
  const navTabMaternal = document.getElementById('nav-tab-maternal');
  const navTabNutrition = document.getElementById('nav-tab-nutrition');

  const tabs = [
    { id: 'spine', element: tabContentSpine, nav: navTabSpine },
    { id: 'maternal', element: tabContentMaternal, nav: navTabMaternal },
    { id: 'nutrition', element: tabContentNutrition, nav: navTabNutrition }
  ];

  // Tab Switch Logic
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

  // Bind Bottom Nav Bar
  tabs.forEach(tab => {
    tab.nav.addEventListener('click', () => {
      switchTab(tab.id);
    });
  });

  if (autostart) {
    switchTab(autostart);
  }

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

  let defaultSpineSymptoms = 'My spine feels normal.';

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
      spineStateBadge.className = 'spine-badge badge-green';
      spineStateBadge.textContent = 'Low';
      stressLevelText.textContent = 'Low tension';
      stressLevelText.style.color = 'var(--color-success)';
      stressRecText.textContent = 'Recommend passive stretching, deep diaphragmatic breaths, and a standard 10° back-extension.';
      defaultSpineSymptoms = 'I have low spine tension but sit for ' + hSedentary + ' hours a day.';
    } else if (tSpine < 75) {
      spineVisualBox.classList.add('state-amber');
      spineStateBadge.className = 'spine-badge badge-amber';
      spineStateBadge.textContent = 'Amber';
      stressLevelText.textContent = 'Moderate strain';
      stressLevelText.style.color = 'var(--color-warning)';
      stressRecText.textContent = 'Auto-generate a somatic core alignment routine. Highlighting C4-C5 and L4-L5 vertebral joint strain.';
      defaultSpineSymptoms = 'I am experiencing moderate back strain. I sit for ' + hSedentary + ' hours and feel muscle tension.';
    } else {
      spineVisualBox.classList.add('state-red');
      spineStateBadge.className = 'spine-badge badge-red';
      spineStateBadge.textContent = 'Spasm';
      stressLevelText.textContent = 'Critical Spasm';
      stressLevelText.style.color = 'var(--color-danger)';
      stressRecText.textContent = 'Flashing Red Alert: Critical spasm state. Triggering prioritized double-blind referral routing to secure physical therapy consultations.';
      defaultSpineSymptoms = 'I am in critical spasm state! Severe back/neck pain. Please help.';
    }
  }

  inputHours.addEventListener('input', updateSpineSimulator);
  inputTension.addEventListener('input', updateSpineSimulator);
  updateSpineSimulator(); 

  // ==================== MATERNAL HEALTH TRACKER ====================
  const inputPostpartumDay = document.getElementById('input-postpartum-day');
  const maternalDaysText = document.getElementById('maternal-days-text');
  const pelvicPainText = document.getElementById('pelvic-pain-text');
  const painButtons = document.querySelectorAll('[data-pain]');

  let defaultMaternalSymptoms = 'I am on postpartum day 12 with mild pelvic pain.';

  inputPostpartumDay.addEventListener('input', () => {
    maternalDaysText.textContent = `Day ${inputPostpartumDay.value}`;
    updateMaternalSymptoms();
  });

  function updateMaternalSymptoms() {
    defaultMaternalSymptoms = `I am on postpartum day ${inputPostpartumDay.value} with ${pelvicPainText.textContent.toLowerCase()} pelvic pain.`;
  }

  painButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      painButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const painLevel = btn.getAttribute('data-pain');
      
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
      updateMaternalSymptoms();
    });
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
        <div class="card-header">
          <div class="card-title">${item.title}</div>
          <span class="remedy-badge">Menu Ready</span>
        </div>
        <div class="remedy-row">
          <div class="remedy-label">Staple Grain Base:</div>
          <div class="remedy-val">${item.grain}</div>
        </div>
        <div class="remedy-row">
          <div class="remedy-label">Active Botanicals (Superfood):</div>
          <div class="remedy-val">${item.botanical}</div>
        </div>
        <div class="remedy-row">
          <div class="remedy-label">Mechanism:</div>
          <div class="remedy-val" style="color:var(--color-success);">${item.mechanism}</div>
        </div>
        <div class="remedy-row remedy-avoid">
          <span style="font-weight:600;">Avoid:</span> ${item.avoid}
        </div>
      `;
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
      });
      nutritionGridBox.appendChild(card);
    });
  }
  renderNutritionCompiler();

  // ==================== SPECIALIST MATCH & CONSULTATION ====================
  const overlaySpecialist = document.getElementById('overlay-specialist');
  const inputSymptoms = document.getElementById('input-symptoms');
  
  const overlaySuccess = document.getElementById('overlay-success');
  const successTitle = document.getElementById('success-title');
  const successMessage = document.getElementById('success-message');
  
  const btnSpecialistCancel = document.getElementById('btn-specialist-cancel');
  const btnSpecialistSearch = document.getElementById('btn-specialist-search');
  
  const cliniciansResults = document.getElementById('clinicians-results');
  const cliniciansList = document.getElementById('clinicians-list');

  const btnSpineBooking = document.getElementById('btn-spine-booking');
  const btnMaternalBooking = document.getElementById('btn-maternal-booking');
  const btnSuccessClose = document.getElementById('btn-success-close');

  btnSpineBooking.addEventListener('click', () => {
    inputSymptoms.value = defaultSpineSymptoms;
    cliniciansResults.style.display = 'none';
    overlaySpecialist.classList.add('active');
  });

  btnMaternalBooking.addEventListener('click', () => {
    inputSymptoms.value = defaultMaternalSymptoms;
    cliniciansResults.style.display = 'none';
    overlaySpecialist.classList.add('active');
  });

  btnSpecialistCancel.addEventListener('click', () => {
    overlaySpecialist.classList.remove('active');
  });

  btnSuccessClose.addEventListener('click', () => {
    overlaySuccess.classList.remove('active');
  });

  btnSpecialistSearch.addEventListener('click', async () => {
    const symptoms = inputSymptoms.value.trim();
    if (!symptoms) {
      alert('Please describe your symptoms.');
      return;
    }

    btnSpecialistSearch.disabled = true;
    btnSpecialistSearch.textContent = 'Searching...';
    
    try {
      const doctors = await matchClinicians(symptoms);
      renderClinicians(doctors, symptoms);
    } catch (err) {
      alert('Failed to find specialists.');
    } finally {
      btnSpecialistSearch.disabled = false;
      btnSpecialistSearch.textContent = 'Search Doctors';
    }
  });

  function renderClinicians(doctors, symptoms) {
    cliniciansResults.style.display = 'block';
    cliniciansList.innerHTML = '';
    
    if (doctors.length === 0) {
      cliniciansList.innerHTML = '<div style="color:var(--color-text-secondary); font-size:13px;">No doctors found matching your symptoms.</div>';
      return;
    }

    doctors.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'glass-panel';
      card.style.padding = '12px';
      card.style.marginBottom = '0';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:bold; font-size:15px;">Dr. ${doc.firstName}</div>
            <div style="font-size:12px; color:var(--color-text-secondary);">${doc.specialty}</div>
            <div style="font-size:11px; margin-top:4px; color:#10B981;">Options: ${doc.treatmentOptions.join(', ') || 'In-Clinic'}</div>
          </div>
          <button class="btn btn-primary btn-consult" data-id="${doc.id}" style="padding:6px 12px; font-size:12px; width:auto;">Consult</button>
        </div>
      `;
      cliniciansList.appendChild(card);
    });

    document.querySelectorAll('.btn-consult').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const clinicianId = e.target.getAttribute('data-id');
        startConsultationFlow(clinicianId, symptoms);
      });
    });
  }

  async function startConsultationFlow(clinicianId, symptoms) {
    overlaySpecialist.classList.remove('active');

    try {
      const result = await startConsultation({
        patientTelegramId: userId,
        clinicianId: clinicianId,
        symptoms: symptoms
      });

      successTitle.textContent = 'Consultation Started!';
      let warningHtml = '';
      if (result.warnings && result.warnings.length > 0) {
        warningHtml = `<div class="warning-box" style="margin-top: 15px; padding: 12px; background: rgba(239, 68, 68, 0.15); border-left: 4px solid #EF4444; border-radius: 6px; font-size: 0.9rem; text-align: left; color: #FCA5A5; line-height: 1.4;">` +
          `<strong style="color: #F87171; display: block; margin-bottom: 5px;">⚠️ Telegram Delivery Warning:</strong>` +
          result.warnings.map(w => `• ${w}`).join('<br>') +
          `</div>`;
      }
      successMessage.innerHTML = 
        `Your consultation request has been sent to <strong>Dr. ${result.clinician.firstName}</strong>.<br><br>` +
        `Please open your direct chat thread with the clinician's Telegram account.<br><br>` +
        `The clinician's <strong>AI front-desk</strong> is already waiting for your reply!` +
        warningHtml;
      overlaySuccess.classList.add('active');
    } catch (err) {
      alert('Failed to start consultation. Make sure backend server is running.');
    }
  }

});
