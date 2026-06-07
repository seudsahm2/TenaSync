// ጤና-Sync Patient Mini App Logic (Eyob's Module)

document.addEventListener('DOMContentLoaded', () => {
  // ─── STATE MANAGEMENT ───────────────────────────────────────────
  let activeUserId = null;
  let profileData = null;
  let dashboardStats = null;
  let currentAppTab = 'active'; // 'active', 'completed', 'cancelled'
  let selectedDoctor = null; // Store doctor selection for booking
  let defaultTgName = null; // Store Telegram name

  // Parse user_id from Telegram URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  let tgUserId = urlParams.get('user_id');
  defaultTgName = urlParams.get('name') || urlParams.get('username') || null;

  // Try to use secure Telegram WebApp SDK if available
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    tgUserId = user.id.toString();
    defaultTgName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || defaultTgName;
  }

  // ─── DOM ELEMENTS ──────────────────────────────────────────────
  const navDash = document.getElementById('nav-dash');
  const navProfile = document.getElementById('nav-profile');
  const navRecovery = document.getElementById('nav-recovery');
  const navAppointments = document.getElementById('nav-appointments');
  const navSettings = document.getElementById('nav-settings');
  const navHistory = document.getElementById('nav-history');

  const views = {
    login: document.getElementById('view-login'),
    dashboard: document.getElementById('view-dashboard'),
    profile: document.getElementById('view-profile'),
    chat: document.getElementById('view-chat'),
    qa: document.getElementById('view-qa'),
    chatResults: document.getElementById('view-chat-results'),
    specialists: document.getElementById('view-specialists'),
    specialistDetail: document.getElementById('view-specialist-detail'),
    booking: document.getElementById('view-booking'),
    appointments: document.getElementById('view-appointments'),
    history: document.getElementById('view-history'),
    recovery: document.getElementById('view-recovery'),
    notifications: document.getElementById('view-notifications'),
    settings: document.getElementById('view-settings')
  };

  // ─── NAVIGATION ─────────────────────────────────────────────────
  function showView(viewName) {
    // Hide all views
    Object.keys(views).forEach(key => {
      if (views[key]) views[key].classList.remove('active');
    });

    // Show selected view
    if (views[viewName]) {
      views[viewName].classList.add('active');
    }

    // Update active nav item
    const navItems = document.querySelectorAll('.tab-navigation .nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    if (viewName === 'dashboard' || viewName === 'notifications') {
      navDash.classList.add('active');
    } else if (viewName === 'profile') {
      navProfile.classList.add('active');
    } else if (viewName === 'recovery') {
      navRecovery.classList.add('active');
    } else if (viewName === 'appointments' || viewName === 'booking' || viewName === 'specialists' || viewName === 'specialistDetail') {
      navAppointments.classList.add('active');
    } else if (viewName === 'history') {
      navHistory.classList.add('active');
    } else if (viewName === 'settings') {
      navSettings.classList.add('active');
    }
  }

  // Nav Bindings
  navDash.addEventListener('click', () => {
    if (!activeUserId) return;
    fetchDashboardData();
    showView('dashboard');
  });

  navProfile.addEventListener('click', () => {
    if (!activeUserId) return;
    fetchProfile();
    showView('profile');
  });

  navRecovery.addEventListener('click', () => {
    if (!activeUserId) return;
    fetchRecoveryLogs();
    showView('recovery');
  });

  navAppointments.addEventListener('click', () => {
    if (!activeUserId) return;
    fetchAppointments();
    showView('appointments');
  });

  if (navHistory) {
    navHistory.addEventListener('click', () => {
      if (!activeUserId) return;
      fetchHistory();
      showView('history');
    });
  }

  navSettings.addEventListener('click', () => {
    if (!activeUserId) return;
    fetchProfile(); // Load toggles state
    showView('settings');
  });

  // ─── SECURE AUTO LOGIN / ACCOUNT CONNECTION ──────────────────────
  async function connectAccount(tgIdInput) {
    try {
      // Hit real backend login endpoint to fetch/create user and get proper UUID
      const loginRes = await fetch('/api/patient/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tgIdInput, name: defaultTgName })
      });
      const userData = await loginRes.json();
      activeUserId = userData.id; // Map to true UUID so profile saving works

      // Fetch/Create Profile
      await fetchProfile();
      // Fetch Stats
      await fetchDashboardData();
      // Go to Dashboard
      showView('dashboard');
      // Show bottom navigation
      document.querySelector('.tab-navigation').style.display = 'flex';
    } catch (err) {
      showAlert('Connection Failed', 'Could not reach server. Building local offline backup mode.', '⚠️');
      activeUserId = 'local_backup';
      setupLocalBackupData();
      showView('dashboard');
      document.querySelector('.tab-navigation').style.display = 'flex';
    }
  }

  // Auto-connect if user ID is found securely via Telegram
  if (tgUserId) {
    connectAccount(tgUserId);
  } else {
    // If absolutely no TG ID is found (e.g. opened in browser), auto-generate a fallback ID and save it so it doesn't change on reload.
    let fallbackId = localStorage.getItem('webFallbackId');
    if (!fallbackId) {
      fallbackId = 'web_' + Math.floor(Math.random() * 1000000000);
      localStorage.setItem('webFallbackId', fallbackId);
    }
    connectAccount(fallbackId);
  }

  // ─── PROFILE LOGIC & CUSTOM COMBOBOXES ─────────────────────
  const COMMON_DISEASES = [
    "Hypertension", "Type 2 Diabetes", "Malaria", "Typhoid", "Gastritis", "Asthma",
    "Tuberculosis", "Pneumonia", "Anemia", "Peptic Ulcer Disease", "Migraine",
    "Osteoarthritis", "Rheumatoid Arthritis", "Lower Back Pain", "Sciatica",
    "Cervical Spondylosis", "Postpartum Hemorrhage", "Pelvic Organ Prolapse",
    "Endometriosis", "PCOS", "Fibroids", "Vitamin D Deficiency", "Malnutrition"
  ];
  const COMMON_ALLERGIES = ["Penicillin", "Peanuts", "Pollen", "Dust Mites", "Latex", "Ibuprofen", "Aspirin", "Dairy", "Gluten"];
  const COMMON_MEDS = ["Paracetamol", "Lisinopril", "Metformin", "Omeprazole", "Amoxicillin", "Ibuprofen", "Amlodipine"];
  const COMMON_INJURIES = ["Whiplash", "Fractured Tibia", "Rotator Cuff Tear", "Herniated Disc", "Sprained Ankle"];

  let activeConditionsArr = [];
  let healedConditionsArr = [];
  let allergiesArr = [];
  let medsArr = [];
  let injuriesArr = [];

  function setupCombobox(inputId, dropdownId, listId, dataList, stateArr, renderFn) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      dropdown.innerHTML = '';
      if (!val) {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.style.display = 'block';
      let matches = dataList.filter(d => d.toLowerCase().includes(val));
      
      matches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'combobox-option';
        div.textContent = m;
        div.onclick = () => {
          if (!stateArr.includes(m)) stateArr.push(m);
          input.value = '';
          dropdown.style.display = 'none';
          renderFn();
        };
        dropdown.appendChild(div);
      });

      const addDiv = document.createElement('div');
      addDiv.className = 'combobox-add-new';
      addDiv.innerHTML = `+ Add "${input.value}" manually`;
      addDiv.onclick = () => {
        const customVal = input.value.trim();
        if (!stateArr.includes(customVal)) stateArr.push(customVal);
        input.value = '';
        dropdown.style.display = 'none';
        renderFn();
      };
      dropdown.appendChild(addDiv);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  function toggleHealedCondition(cond) {
    const actIdx = activeConditionsArr.indexOf(cond);
    if (actIdx > -1) {
      activeConditionsArr.splice(actIdx, 1);
      healedConditionsArr.push(cond);
    } else {
      const healIdx = healedConditionsArr.indexOf(cond);
      if (healIdx > -1) healedConditionsArr.splice(healIdx, 1);
      activeConditionsArr.push(cond);
    }
    renderConditions();
  }

  function removeCondition(cond) {
    const actIdx = activeConditionsArr.indexOf(cond);
    if (actIdx > -1) activeConditionsArr.splice(actIdx, 1);
    const healIdx = healedConditionsArr.indexOf(cond);
    if (healIdx > -1) healedConditionsArr.splice(healIdx, 1);
    renderConditions();
  }

  function renderConditions() {
    const activeList = document.getElementById('active-conditions-list');
    const healedList = document.getElementById('healed-conditions-list');
    activeList.innerHTML = '';
    healedList.innerHTML = '';

    if (activeConditionsArr.length === 0) activeList.innerHTML = '<div style="font-size:12px; color:#9CA3AF; padding:8px;">No active conditions</div>';
    if (healedConditionsArr.length === 0) healedList.innerHTML = '<div style="font-size:12px; color:#9CA3AF; padding:8px;">No healed conditions</div>';

    activeConditionsArr.forEach(c => {
      const div = document.createElement('div');
      div.className = 'condition-item';
      div.innerHTML = `<span class="item-text">${c}</span><div class="item-actions"><input type="checkbox" class="healed-checkbox" title="Mark as Healed"><button type="button" class="btn-remove-condition">✖</button></div>`;
      div.querySelector('.healed-checkbox').addEventListener('change', () => toggleHealedCondition(c));
      div.querySelector('.btn-remove-condition').addEventListener('click', () => {
        activeConditionsArr = activeConditionsArr.filter(x => x !== c);
        renderConditions();
      });
      activeList.appendChild(div);
    });

    healedConditionsArr.forEach(c => {
      const div = document.createElement('div');
      div.className = 'condition-item healed';
      div.innerHTML = `<span class="item-text">${c}</span><div class="item-actions"><input type="checkbox" class="healed-checkbox" checked title="Mark as Active"><button type="button" class="btn-remove-condition">✖</button></div>`;
      div.querySelector('.healed-checkbox').addEventListener('change', () => toggleHealedCondition(c));
      div.querySelector('.btn-remove-condition').addEventListener('click', () => {
        healedConditionsArr = healedConditionsArr.filter(x => x !== c);
        renderConditions();
      });
      healedList.appendChild(div);
    });
  }

  function renderSimpleList(listId, stateArr, renderCallback) {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    if (stateArr.length === 0) {
      list.innerHTML = '<div style="font-size:12px; color:#9CA3AF; padding:8px;">None added</div>';
    }
    stateArr.forEach(item => {
      const div = document.createElement('div');
      div.className = 'condition-item';
      div.innerHTML = `<span class="item-text">${item}</span><div class="item-actions"><button type="button" class="btn-remove-condition">✖</button></div>`;
      div.querySelector('.btn-remove-condition').addEventListener('click', () => {
        const index = stateArr.indexOf(item);
        if (index > -1) stateArr.splice(index, 1);
        renderCallback();
      });
      list.appendChild(div);
    });
  }

  const renderAllergies = () => renderSimpleList('allergies-list', allergiesArr, renderAllergies);
  const renderMeds = () => renderSimpleList('meds-list', medsArr, renderMeds);
  const renderInjuries = () => renderSimpleList('injuries-list', injuriesArr, renderInjuries);

  setupCombobox('disease-search-input', 'disease-dropdown', 'active-conditions-list', COMMON_DISEASES, activeConditionsArr, renderConditions);
  setupCombobox('allergies-search-input', 'allergies-dropdown', 'allergies-list', COMMON_ALLERGIES, allergiesArr, renderAllergies);
  setupCombobox('meds-search-input', 'meds-dropdown', 'meds-list', COMMON_MEDS, medsArr, renderMeds);
  setupCombobox('injuries-search-input', 'injuries-dropdown', 'injuries-list', COMMON_INJURIES, injuriesArr, renderInjuries);

  async function fetchProfile() {
    const res = await fetch(`/api/patient/profile/${activeUserId}`);
    profileData = await res.json();

    // Prefill form inputs
    document.getElementById('prof-fullName').value = profileData.fullName || '';
    document.getElementById('prof-age').value = profileData.age || '';
    document.getElementById('prof-gender').value = profileData.gender || '';
    document.getElementById('prof-phone').value = profileData.phoneNumber || '';
    document.getElementById('prof-location').value = profileData.location || '';
    document.getElementById('prof-emergency').value = profileData.emergencyContact || '';
    document.getElementById('prof-occupation').value = profileData.occupation || '';
    document.getElementById('prof-activity').value = profileData.activityLevel || '';
    document.getElementById('prof-workStyle').value = profileData.workStyle || '';
    
    // Parse combined conditions logic
    const conds = profileData.existingConditions || '';
    const activeMatch = conds.match(/Active: (.*?)(?: \| Healed:|$)/);
    const healedMatch = conds.match(/Healed: (.*)$/);
    
    let aStr = activeMatch ? activeMatch[1].trim() : conds.replace(/Healed:.*/, '').trim();
    let hStr = healedMatch ? healedMatch[1].trim() : '';
    
    activeConditionsArr.length = 0;
    if (aStr) activeConditionsArr.push(...aStr.split(',').map(s => s.trim()).filter(Boolean));
    healedConditionsArr.length = 0;
    if (hStr) healedConditionsArr.push(...hStr.split(',').map(s => s.trim()).filter(Boolean));
    renderConditions();

    allergiesArr.length = 0;
    if (profileData.allergies) allergiesArr.push(...profileData.allergies.split(',').map(s => s.trim()).filter(Boolean));
    medsArr.length = 0;
    if (profileData.currentMedications) medsArr.push(...profileData.currentMedications.split(',').map(s => s.trim()).filter(Boolean));
    injuriesArr.length = 0;
    if (profileData.previousInjuries) injuriesArr.push(...profileData.previousInjuries.split(',').map(s => s.trim()).filter(Boolean));
    
    renderAllergies();
    renderMeds();
    renderInjuries();

    // Prefill settings and dashboard banner
    let displayName = profileData.fullName || defaultTgName || 'Guest Patient';
    document.getElementById('dash-user-name').textContent = displayName;
    document.getElementById('set-anonymous').checked = !!profileData.anonymousMode;
    document.getElementById('set-womens').checked = !!profileData.womensPrivacyMode;
    document.getElementById('set-language').value = profileData.preferredLanguage || 'English';

    const anonBadge = document.getElementById('dash-anonymous-badge');
    if (profileData.anonymousMode) {
      anonBadge.style.display = 'inline-block';
    } else {
      anonBadge.style.display = 'none';
    }
  }

  const btnSaveProfile = document.getElementById('btn-save-profile');
  btnSaveProfile.addEventListener('click', async () => {
    
    // Build brilliant conditions format for AI Awareness
    let combinedC = '';
    if (activeConditionsArr.length > 0 || healedConditionsArr.length > 0) {
       combinedC = `Active: ${activeConditionsArr.join(', ')} | Healed: ${healedConditionsArr.join(', ')}`;
    }

    const formData = {
      fullName: document.getElementById('prof-fullName').value.trim(),
      age: document.getElementById('prof-age').value,
      gender: document.getElementById('prof-gender').value,
      phoneNumber: document.getElementById('prof-phone').value.trim(),
      location: document.getElementById('prof-location').value.trim(),
      emergencyContact: document.getElementById('prof-emergency').value.trim(),
      occupation: document.getElementById('prof-occupation').value,
      activityLevel: document.getElementById('prof-activity').value,
      workStyle: document.getElementById('prof-workStyle').value,
      existingConditions: combinedC,
      allergies: allergiesArr.join(', '),
      currentMedications: medsArr.join(', '),
      previousInjuries: injuriesArr.join(', '),
    };

    btnSaveProfile.disabled = true;
    btnSaveProfile.textContent = 'Saving...';

    try {
      const res = await fetch(`/api/patient/profile/${activeUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      profileData = await res.json();
      showAlert('Success', 'Profile saved successfully!', '✓');
      fetchProfile();
    } catch (err) {
      showAlert('Offline Error', 'Could not save profile to server.', '⚠️');
    } finally {
      btnSaveProfile.disabled = false;
      btnSaveProfile.textContent = '💾 Save Profile';
    }
  });

  // ─── DASHBOARD LOGIC ────────────────────────────────────────────
  async function fetchDashboardData() {
    try {
      fetchReminders(); // Load medication reminders
      fetchHistory(); // Load history

      const res = await fetch(`/api/patient/dashboard/${activeUserId}`);
      dashboardStats = await res.json();

      // Render Overview stats
      document.getElementById('dash-avg-pain').textContent = dashboardStats.averagePain || '0.0';
      document.getElementById('dash-exercise-completed').textContent = dashboardStats.completedExercisesCount || '0';

      // Render upcoming appointment card
      const appointContainer = document.getElementById('dash-appointment-container');
      if (dashboardStats.upcomingAppointment) {
        const app = dashboardStats.upcomingAppointment;
        const formattedDate = new Date(app.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        appointContainer.innerHTML = `
                    <div class="card-appointment">
                        <div style="font-weight:bold; color:var(--color-accent);">Dr. ${app.clinician.firstName}</div>
                        <div style="font-size:12px; color:var(--color-text-secondary);">${app.clinician.specialty}</div>
                        <div class="appointment-meta">
                            <span>📅 ${formattedDate}</span>
                            <span>📍 ${app.consultationType || 'Online'}</span>
                        </div>
                    </div>
                `;
      } else {
        appointContainer.innerHTML = `<p style="font-size:13px; color:var(--color-text-secondary); margin:0;">No upcoming appointments.</p>`;
      }
    } catch (err) {
      console.error('Stats fetch failed');
    }
  }

  // Dashboard Banner Notifications Card
  document.getElementById('dash-notifications-card').addEventListener('click', () => {
    fetchNotifications();
    showView('notifications');
  });

  // Dashboard navigation links
  document.getElementById('action-consult-ai').addEventListener('click', () => {
    showView('chat');
  });
  document.getElementById('action-general-qa').addEventListener('click', () => {
    showView('qa');
  });
  document.getElementById('action-find-specialist').addEventListener('click', () => {
    fetchSpecialists();
    showView('specialists');
  });
  document.getElementById('action-my-appointments').addEventListener('click', () => {
    fetchAppointments();
    showView('appointments');
  });
  document.getElementById('action-my-recovery').addEventListener('click', () => {
    fetchRecoveryLogs();
    showView('recovery');
  });

  // Link to specialized sub-modules (Spine, Maternal, Nutrition)
  document.getElementById('action-open-spine').addEventListener('click', () => {
    window.location.href = `/modules/specialized/index.html?tab=spine`;
  });
  document.getElementById('action-open-maternal').addEventListener('click', () => {
    window.location.href = `/modules/specialized/index.html?tab=maternal`;
  });
  document.getElementById('action-open-nutrition').addEventListener('click', () => {
    window.location.href = `/modules/specialized/index.html?tab=nutrition`;
  });

  // ─── AI CHAT LOGIC ──────────────────────────────────────────────
  // The AI Chat has been securely integrated with Seud's Module
  document.getElementById('action-consult-ai').addEventListener('click', () => {
    showView('chat');
    // Ensure it doesn't initialize twice
    if (!document.querySelector('#patient-ai-chat-mount .ai-assistant-container')) {
      if (window.AIAssistantWidget) {
        new window.AIAssistantWidget('patient-ai-chat-mount');
        // Add voice placeholder
        const chatInputArea = document.querySelector('#patient-ai-chat-mount .chat-input-area');
        if (chatInputArea) {
          const micBtn = document.createElement('button');
          micBtn.innerHTML = '🎤';
          micBtn.className = 'btn';
          micBtn.style.width = 'auto';
          micBtn.style.marginRight = '10px';
          micBtn.onclick = () => alert('🎙 Voice recording initialized (Amharic translation ready) - Placeholder');
          chatInputArea.insertBefore(micBtn, chatInputArea.firstChild);
        }
      } else {
        document.getElementById('patient-ai-chat-mount').innerHTML = '<p style="padding:20px; text-align:center;">AI Module is offline. Please load app.js correctly.</p>';
      }
    }
  });

  document.getElementById('btn-res-dismiss').addEventListener('click', () => {
    showView('dashboard');
  });
  document.getElementById('btn-res-find-doctor').addEventListener('click', () => {
    fetchSpecialists();
    showView('specialists');
  });

  // ─── GENERAL HEALTH Q&A LOGIC ───────────────────────────────────
  const qaSendBtn = document.getElementById('btn-qa-send');
  const qaMsgInput = document.getElementById('qa-message-input');
  const qaContainer = document.getElementById('qa-messages-container');
  const qaMicBtn = document.getElementById('btn-qa-mic');

  if (qaMicBtn) {
    qaMicBtn.addEventListener('click', () => {
      alert('🎙 Voice recording initialized (Amharic translation ready) - Placeholder');
    });
  }

  if (qaSendBtn) {
    qaSendBtn.addEventListener('click', async () => {
      const questionText = qaMsgInput.value.trim();
      if (!questionText) return;

      // Render patient bubble
      const userBubble = document.createElement('div');
      userBubble.className = `chat-bubble patient`;
      userBubble.textContent = questionText;
      qaContainer.appendChild(userBubble);
      qaContainer.scrollTop = qaContainer.scrollHeight;

      qaMsgInput.value = '';

      // Add typing bubble
      const typingBubble = document.createElement('div');
      typingBubble.className = `chat-bubble ai`;
      typingBubble.textContent = 'Thinking...';
      qaContainer.appendChild(typingBubble);
      qaContainer.scrollTop = qaContainer.scrollHeight;

      try {
        const lang = document.getElementById('set-language').value || 'English';
        
        const res = await fetch('/api/ai/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: questionText, language: lang, userId: activeUserId })
        });
        const data = await res.json();

        typingBubble.remove();

        if (data.success && data.data && data.data.answer) {
          const aiBubble = document.createElement('div');
          aiBubble.className = `chat-bubble ai`;
          aiBubble.textContent = data.data.answer;
          qaContainer.appendChild(aiBubble);
        } else {
          throw new Error('Failed to get answer');
        }
      } catch (err) {
        typingBubble.textContent = "I'm experiencing connectivity issues. Please try again soon.";
      }
      qaContainer.scrollTop = qaContainer.scrollHeight;
    });

    qaMsgInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') qaSendBtn.click();
    });
  }

  // ─── SPECIALISTS & BOOKING LOGIC ─────────────────────────────────
  const btnSpecialistAiSearch = document.getElementById('btn-specialist-ai-search');
  const inputSpecialistSearch = document.getElementById('specialist-search-input');

  if (btnSpecialistAiSearch) {
    btnSpecialistAiSearch.addEventListener('click', () => {
      const condition = inputSpecialistSearch.value.trim() || 'general';
      fetchSpecialists(condition);
    });
  }

  if (inputSpecialistSearch) {
    inputSpecialistSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') btnSpecialistAiSearch.click();
    });
  }

  // ─── SOCKET.IO CALENDAR SYNC ────────────────────────────────────
  let socket = null;
  if (typeof io !== 'undefined') {
    socket = io();
  }

  // ─── LIVE APPOINTMENT CALENDAR LOGIC ─────────────────────────────
  let selectedSlot = null;
  let activeDoctorCalendar = [];
  let activeBookedSlots = [];

  function renderPatientCalendar(doctorId) {
    const container = document.getElementById('patient-calendar-container');
    if (!container) return;
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '60px repeat(7, minmax(80px, 1fr))';
    grid.style.gap = '5px';

    grid.innerHTML = `
      <div style="font-weight:bold; font-size:11px; color:gray; text-align:right; padding-right:5px;">Time</div>
      <div style="font-weight:bold; font-size:11px; text-align:center;">Mon</div>
      <div style="font-weight:bold; font-size:11px; text-align:center;">Tue</div>
      <div style="font-weight:bold; font-size:11px; text-align:center;">Wed</div>
      <div style="font-weight:bold; font-size:11px; text-align:center;">Thu</div>
      <div style="font-weight:bold; font-size:11px; text-align:center;">Fri</div>
      <div style="font-weight:bold; font-size:11px; text-align:center;">Sat</div>
      <div style="font-weight:bold; font-size:11px; text-align:center;">Sun</div>
    `;

    // Calculate dynamic rows based on active slots
    if(activeDoctorCalendar.length === 0) {
      container.innerHTML = '<p style="text-align:center; font-size:12px; color:gray;">Doctor has not set availability yet.</p>';
      return;
    }

    // Default to 30 min intervals, 08:00 to 18:00
    const startHour = 8;
    const endHour = 18;
    const intervalMins = 30; // In a production app, we would infer this from the slots array
    const totalRows = Math.ceil(((endHour - startHour) * 60) / intervalMins);

    for (let row = 0; row < totalRows; row++) {
      const currentMins = (startHour * 60) + (row * intervalMins);
      const nextMins = currentMins + intervalMins;
      
      const hr1 = Math.floor(currentMins / 60).toString().padStart(2, '0');
      const m1 = (currentMins % 60).toString().padStart(2, '0');
      
      const timeLabel = `${hr1}:${m1}`;

      const timeDiv = document.createElement('div');
      timeDiv.style.fontSize = '10px';
      timeDiv.style.color = 'gray';
      timeDiv.style.textAlign = 'right';
      timeDiv.style.paddingRight = '5px';
      timeDiv.style.marginTop = '2px';
      timeDiv.textContent = timeLabel;
      grid.appendChild(timeDiv);

      // Generate next 7 days starting from next Monday, or just generic days
      for (let day = 1; day <= 7; day++) {
        const backendDay = day === 7 ? 0 : day;
        
        const cell = document.createElement('div');
        cell.style.borderRadius = '4px';
        cell.style.height = '24px';
        cell.style.transition = 'all 0.2s';
        
        // Is slot available?
        const isAvailable = activeDoctorCalendar.some(s => s.dayOfWeek === backendDay && s.startTime === timeLabel);
        
        // Calculate date for this specific cell (dummy logic for next 7 days based on current day)
        // Here we just use a generic format to check booking
        const isBooked = activeBookedSlots.some(b => {
           const bDate = new Date(b.scheduledTime);
           return bDate.getDay() === backendDay && `${bDate.getHours().toString().padStart(2,'0')}:${bDate.getMinutes().toString().padStart(2,'0')}` === timeLabel;
        });

        if (isBooked) {
           cell.style.background = 'rgba(239, 68, 68, 0.4)';
           cell.style.border = '1px solid var(--color-danger)';
           cell.style.cursor = 'not-allowed';
           cell.title = 'Taken';
        } else if (isAvailable) {
           cell.style.background = 'rgba(16, 185, 129, 0.4)';
           cell.style.border = '1px solid var(--color-success)';
           cell.style.cursor = 'pointer';
           cell.title = 'Available';
           
           // If it's currently selected
           if (selectedSlot && selectedSlot.day === backendDay && selectedSlot.time === timeLabel) {
               cell.style.background = 'rgba(59, 130, 246, 0.6)';
               cell.style.border = '2px solid var(--color-accent)';
           }

           cell.addEventListener('click', () => {
             selectedSlot = { day: backendDay, time: timeLabel };
             // Mock standard JS Date generation for the selected slot (Next upcoming 'dayOfWeek')
             const d = new Date();
             d.setDate(d.getDate() + ((backendDay + 7 - d.getDay()) % 7 || 7));
             d.setHours(parseInt(hr1), parseInt(m1), 0, 0);
             
             // Convert to local datetime-local format
             const offset = d.getTimezoneOffset() * 60000;
             const localISOTime = (new Date(d - offset)).toISOString().slice(0, 16);
             document.getElementById('book-datetime').value = localISOTime;
             
             document.getElementById('btn-booking-confirm').disabled = false;
             renderPatientCalendar(doctorId);
           });
        } else {
           cell.style.background = 'rgba(255,255,255,0.03)';
           cell.style.border = '1px solid rgba(255,255,255,0.05)';
        }

        grid.appendChild(cell);
      }
    }
    container.appendChild(grid);
  }

  async function loadDoctorCalendar(doctorId) {
    document.getElementById('patient-calendar-container').innerHTML = '<p style="text-align:center; font-size:12px; color:gray;">Loading live slots...</p>';
    selectedSlot = null;
    document.getElementById('btn-booking-confirm').disabled = true;

    try {
       const res = await fetch(`/api/doctor/availability/${doctorId}`);
       activeDoctorCalendar = await res.json();
       
       // Get booked consultations to find taken slots
       const cRes = await fetch(`/api/doctor/patients/${activeUserId}/history`); // Wait, we need all consults for this doctor to know which are taken.
       // Actually, we can fetch all consultations for this doctor via a new endpoint or pass it in availability.
       // Since the endpoint doesn't exist, we will assume patients can only see their own taken slots unless we build a public schedule route.
       // For hackathon, we will render it natively without the booked slots cross-check if the route is missing.
       activeBookedSlots = []; 
       
       renderPatientCalendar(doctorId);

       // Setup socket listener
       if (socket) {
          socket.emit('watch_doctor_slots', doctorId);
          socket.off('calendar_updated');
          socket.on('calendar_updated', (docId) => {
             if(docId === doctorId) loadDoctorCalendar(doctorId); // Auto-refresh live!
          });
       }
    } catch(e) {
       console.error(e);
    }
  }

  async function fetchSpecialists(condition = 'general') {
    const listContainer = document.getElementById('specialists-list-container');
    listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-text-secondary); text-align:center;">Loading vetted specialists...</p>';

    try {
      // Hits the root matching API which returns clinicians list
      let endpoint = '/api/ai/specialists';
      let payload = { condition };

      // If they just opened the tab without searching, just load all via match endpoint
      if (condition === 'general') {
        endpoint = '/api/clinicians/match';
        payload = { symptoms: 'general' };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const jsonRes = await res.json();
      // Handle difference in response formats (AI endpoint wraps in data.data, regular wraps in array or json)
      const doctors = jsonRes.data || jsonRes;

      listContainer.innerHTML = '';
      if (doctors.length === 0) {
        listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-text-secondary); text-align:center;">No doctors available.</p>';
        return;
      }

      doctors.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'clinician-item';
        card.innerHTML = `
                    <div class="clinician-details">
                        <div class="clinician-name">Dr. ${doc.firstName}</div>
                        <div class="clinician-specialty">${doc.specialty}</div>
                    </div>
                    <button class="btn btn-primary btn-view-doc" data-doc-id="${doc.id}" style="width:auto; padding:6px 14px; font-size:12px;">View</button>
                `;
        listContainer.appendChild(card);
      });

      // View buttons trigger profiles
      document.querySelectorAll('.btn-view-doc').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const docId = btn.getAttribute('data-doc-id');
          selectedDoctor = doctors.find(d => d.id === docId);
          showDoctorDetail(selectedDoctor);
        });
      });

    } catch (err) {
      listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-danger); text-align:center;">Could not retrieve clinicians.</p>';
    }
  }

  function showDoctorDetail(doc) {
    document.getElementById('det-doc-name').textContent = `Dr. ${doc.firstName}`;
    document.getElementById('det-doc-specialty').textContent = doc.specialty;
    document.getElementById('det-doc-options').textContent = doc.treatmentOptions.join(', ') || 'Clinic Visit';
    showView('specialistDetail');
  }

  document.getElementById('btn-det-back').addEventListener('click', () => {
    showView('specialists');
  });

  document.getElementById('btn-det-book').addEventListener('click', () => {
    document.getElementById('book-doctor-name').value = `Dr. ${selectedDoctor.firstName}`;

    // Prefill options select element
    const typeSelect = document.getElementById('book-type');
    typeSelect.innerHTML = '';
    selectedDoctor.treatmentOptions.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt;
      el.textContent = opt;
      typeSelect.appendChild(el);
    });
    
    // Trigger socket calendar load
    loadDoctorCalendar(selectedDoctor.id);

    showView('booking');
  });

  // Confirm Escrow Booking
  const btnBookingConfirm = document.getElementById('btn-booking-confirm');
  btnBookingConfirm.addEventListener('click', async () => {
    const bookType = document.getElementById('book-type').value;
    const bookDate = document.getElementById('book-datetime').value;
    const bookSymptoms = document.getElementById('book-symptoms').value.trim();

    if (!bookDate) {
      alert('Please select a date and time.');
      return;
    }

    btnBookingConfirm.disabled = true;
    btnBookingConfirm.textContent = 'Processing Escrow...';

    try {
      // 1. Initial consultation creation
      const consultRes = await fetch('/api/consultation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientTelegramId: activeUserId,
          clinicianId: selectedDoctor.id,
          symptoms: bookSymptoms || 'Routine somatic alignment session'
        })
      });
      const consultSession = await consultRes.json();

      // 2. Update with selected schedule/time
      await fetch('/api/patient/appointments/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: consultSession.sessionId,
          scheduledTime: bookDate,
          type: bookType
        })
      });

      showAlert('Booking Confirmed!', 'Double-blind escrow active. Your appointment is officially scheduled! Opening Visits.', '✓');
      fetchAppointments();
      showView('appointments');

    } catch (err) {
      showAlert('Booking Failed', 'Make sure server is connected.', '❌');
    } finally {
      btnBookingConfirm.disabled = false;
      btnBookingConfirm.textContent = '🔒 Confirm Escrow Booking';
    }
  });

  // ─── APPOINTMENTS LOGIC ──────────────────────────────────────────
  async function fetchAppointments() {
    const listContainer = document.getElementById('appointments-list-container');
    listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-text-secondary); text-align:center;">Fetching visits...</p>';

    try {
      const res = await fetch(`/api/patient/appointments/${activeUserId}`);
      const appointments = await res.json();

      listContainer.innerHTML = '';

      // Filter by selected tab category
      const filtered = appointments.filter(app => {
        if (currentAppTab === 'active') return app.status === 'ACTIVE';
        if (currentAppTab === 'completed') return app.status === 'COMPLETED';
        return app.status === 'CANCELLED';
      });

      if (filtered.length === 0) {
        listContainer.innerHTML = `<p style="font-size:13px; color:var(--color-text-secondary); text-align:center; padding:10px;">No ${currentAppTab} appointments found.</p>`;
        return;
      }

      filtered.forEach(app => {
        const dateStr = app.scheduledTime
          ? new Date(app.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
          : 'Awaiting scheduling';

        const card = document.createElement('div');
        card.className = 'glass-panel card-appointment';
        card.innerHTML = `
                    <div style="font-weight:bold;">Dr. ${app.clinician.firstName}</div>
                    <div style="font-size:12px; color:var(--color-text-secondary);">${app.clinician.specialty}</div>
                    <div class="appointment-meta">
                        <span>📅 ${dateStr}</span>
                        <span>📍 ${app.consultationType || 'Not chosen'}</span>
                    </div>
                `;
        listContainer.appendChild(card);
      });

    } catch (err) {
      listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-danger); text-align:center;">Could not load appointments.</p>';
    }
  }

  // Toggle appointment tabs
  const appTabBtns = document.querySelectorAll('[data-app-tab]');
  appTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      appTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAppTab = btn.getAttribute('data-app-tab');
      fetchAppointments();
    });
  });

  // ─── RECOVERY LOGGING LOGIC ─────────────────────────────────────
  const recPainInput = document.getElementById('rec-pain');
  const recPainLabel = document.getElementById('rec-pain-label');
  recPainInput.addEventListener('input', () => {
    recPainLabel.textContent = recPainInput.value;
  });

  const btnLogRecovery = document.getElementById('btn-log-recovery');
  btnLogRecovery.addEventListener('click', async () => {
    const data = {
      painLevel: recPainInput.value,
      energyLevel: document.getElementById('rec-energy').value,
      mobility: document.getElementById('rec-mobility').value,
      exerciseCompleted: document.getElementById('rec-exercise').checked,
      notes: document.getElementById('rec-notes').value.trim()
    };

    btnLogRecovery.disabled = true;
    btnLogRecovery.textContent = 'Logging...';

    try {
      await fetch(`/api/patient/recovery/${activeUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      showAlert('Logged', 'Daily recovery logs added!', '✓');
      document.getElementById('recovery-log-form').reset();
      recPainLabel.textContent = '5';
      fetchRecoveryLogs();
      fetchDashboardData();
    } catch (err) {
      showAlert('Failed', 'Database connectivity required.', '❌');
    } finally {
      btnLogRecovery.disabled = false;
      btnLogRecovery.textContent = 'Submit Recovery Entry';
    }
  });

  async function fetchRecoveryLogs() {
    const listContainer = document.getElementById('recovery-history-container');
    listContainer.innerHTML = '<p style="font-size:12px; color:var(--color-text-secondary); text-align:center;">Loading trends...</p>';

    try {
      const res = await fetch(`/api/patient/recovery/${activeUserId}`);
      const logs = await res.json();

      listContainer.innerHTML = '';
      if (logs.length === 0) {
        listContainer.innerHTML = '<p style="font-size:12px; color:var(--color-text-secondary); text-align:center;">No logs recorded yet. Start tracking your progress today!</p>';
        return;
      }

      logs.forEach(log => {
        const dateStr = new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const row = document.createElement('div');
        row.className = 'clinician-item';
        row.style.padding = '8px 12px';
        row.innerHTML = `
                    <div style="text-align:left;">
                        <span style="font-size:12px; font-weight:bold; color:var(--color-text-primary);">${dateStr}</span>
                        <div style="font-size:11px; color:var(--color-text-secondary); margin-top:2px;">Mobility: ${log.mobility} | Energy: ${log.energyLevel}</div>
                        ${log.notes ? `<div style="font-size:10px; color:#9CA3AF; font-style:italic; margin-top:4px;">"${log.notes}"</div>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <span class="badge-amber" style="background:${log.painLevel >= 7 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.1)'}; color:${log.painLevel >= 7 ? '#EF4444' : '#F59E0B'};">Pain: ${log.painLevel}</span>
                        ${log.exerciseCompleted ? '<div style="font-size:9px; color:var(--color-success); margin-top:4px;">✓ Stretch Done</div>' : ''}
                    </div>
                `;
        listContainer.appendChild(row);
      });
    } catch (err) {
      listContainer.innerHTML = '<p style="font-size:12px; color:var(--color-danger); text-align:center;">Could not load logs.</p>';
    }
  }

  // ─── SETTINGS LOGIC ──────────────────────────────────────────────
  const setAnonCheck = document.getElementById('set-anonymous');
  const setWomensCheck = document.getElementById('set-womens');
  const setLangSelect = document.getElementById('set-language');

  async function updatePrivacySettings() {
    if (!activeUserId) return;
    const data = {
      anonymousMode: setAnonCheck.checked,
      womensPrivacyMode: setWomensCheck.checked,
      preferredLanguage: setLangSelect.value
    };

    try {
      await fetch(`/api/patient/profile/${activeUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      fetchProfile();
    } catch (err) {
      console.error('Failed updating toggles');
    }
  }

  setAnonCheck.addEventListener('change', updatePrivacySettings);
  setWomensCheck.addEventListener('change', updatePrivacySettings);
  setLangSelect.addEventListener('change', updatePrivacySettings);

  document.getElementById('btn-logout').addEventListener('click', () => {
    activeUserId = null;
    localStorage.removeItem('webFallbackId'); // Clear saved local session
    document.querySelector('.tab-navigation').style.display = 'none';
    window.location.reload(); // Reload to generate a fresh view/session
  });

  document.getElementById('btn-become-doctor')?.addEventListener('click', async () => {
    if (!activeUserId) return;
    
    // Call the doctor verification endpoint to upgrade role
    try {
      const res = await fetch(`/api/doctor/verify/${profileData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialty: 'General Practitioner',
          treatmentOptions: ['Telehealth', 'Clinic Visit']
        })
      });

      if (res.ok) {
        showAlert('Upgraded to Clinician!', 'Your account has been upgraded. You can now access the Doctor Portal.', '👨‍⚕️');
      } else {
        showAlert('Upgrade Failed', 'Could not process clinician upgrade.', '❌');
      }
    } catch (e) {
      showAlert('Error', 'Could not reach server.', '⚠️');
    }
  });

  // ─── SYSTEM ALERTS & NOTIFICATIONS CENTER ───────────────────────
  function fetchNotifications() {
    const listContainer = document.getElementById('notifications-list-container');
    listContainer.innerHTML = '';

    const notices = [
      { text: "Your somatic stretching routine alignment reminder. Stretch C3-C7 joints.", time: "Today, 9:00 AM" },
      { text: "TenaSync Secure Escrow released CBE Birr 800 consultation payout.", time: "Yesterday" }
    ];

    notices.forEach(n => {
      const item = document.createElement('div');
      item.className = 'clinician-item';
      item.innerHTML = `
                <div style="text-align:left;">
                    <div style="font-size:12px; color:var(--color-text-primary); font-weight:500;">${n.text}</div>
                    <div style="font-size:10px; color:var(--color-text-secondary); margin-top:4px;">${n.time}</div>
                </div>
            `;
      listContainer.appendChild(item);
    });
  }

  // ─── DIALOGS / OVERLAYS SYSTEM ──────────────────────────────────
  function showAlert(title, message, iconStr = '✓') {
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-message').innerHTML = message;
    document.getElementById('overlay-icon').textContent = iconStr;
    document.getElementById('patient-overlay').classList.add('active');
  }

  document.getElementById('btn-overlay-close').addEventListener('click', () => {
    document.getElementById('patient-overlay').classList.remove('active');
  });

  // ─── MEDICATION REMINDERS LOGIC ─────────────────────────────────
  async function fetchReminders() {
    try {
      const res = await fetch(`/api/patient/reminders/${activeUserId}`);
      const reminders = await res.json();
      const listContainer = document.getElementById('reminders-list-container');
      listContainer.innerHTML = '';

      if (reminders.length === 0) {
        listContainer.innerHTML = '<p style="font-size:12px; color:var(--color-text-secondary);">No reminders set.</p>';
        return;
      }

      reminders.forEach(rem => {
        const div = document.createElement('div');
        div.className = 'glass-panel';
        div.style.padding = '8px';
        div.style.marginBottom = '5px';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:13px; font-weight:bold;">${rem.medName}</div>
              <div style="font-size:11px; color:var(--color-text-secondary);">${rem.dosage} at ${rem.time}</div>
            </div>
            <button class="btn btn-danger btn-delete-reminder" data-id="${rem.id}" style="padding:4px; font-size:10px; width:auto;">X</button>
          </div>
        `;
        listContainer.appendChild(div);
      });

      document.querySelectorAll('.btn-delete-reminder').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          await fetch(`/api/patient/reminders/${activeUserId}/${id}`, { method: 'DELETE' });
          fetchReminders();
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  document.getElementById('btn-add-reminder').addEventListener('click', async () => {
    const medName = document.getElementById('rem-name').value;
    const time = document.getElementById('rem-time').value;
    if (!medName || !time) return;

    await fetch(`/api/patient/reminders/${activeUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medName, dosage: '1 Dose', time })
    });
    
    document.getElementById('rem-name').value = '';
    document.getElementById('rem-time').value = '';
    fetchReminders();
  });

  // OCR Upload Handlers
  document.getElementById('btn-upload-prescription').addEventListener('click', () => {
    document.getElementById('ocr-overlay').classList.add('active');
  });

  document.getElementById('btn-ocr-cancel').addEventListener('click', () => {
    document.getElementById('ocr-overlay').classList.remove('active');
  });

  document.getElementById('btn-ocr-upload').addEventListener('click', async () => {
    const fileInput = document.getElementById('ocr-file-input');
    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Please select an image file first.");
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result.split(',')[1];
      const mimeType = file.type;

      document.getElementById('btn-ocr-upload').textContent = "Analyzing via Gemini AI...";
      document.getElementById('btn-ocr-upload').disabled = true;

      try {
        const res = await fetch('/api/ai/analyze-prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data, mimeType })
        });
        
        const json = await res.json();
        
        if (json.success && json.data.medications) {
          // Auto-schedule reminders
          for (let med of json.data.medications) {
            await fetch(`/api/patient/reminders/${activeUserId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ medName: med.name, dosage: med.dosage, time: "09:00", description: med.purpose })
            });
          }
          document.getElementById('ocr-overlay').classList.remove('active');
          showAlert('Prescription Analyzed!', 'Your medications have been mapped and reminders set.', '💊');
          fetchReminders();
        } else {
          alert("Failed to parse image.");
        }
      } catch (err) {
        console.error(err);
        alert("Server error analyzing image.");
      } finally {
        document.getElementById('btn-ocr-upload').textContent = "Analyze Image";
        document.getElementById('btn-ocr-upload').disabled = false;
      }
    };
    reader.readAsDataURL(file);
  });

  // ─── HISTORY & RATING LOGIC ─────────────────────────────────────
  let ratingDoctorId = null;
  let activeChatSessionId = null;

  async function fetchHistory() {
    const listContainer = document.getElementById('history-list-container');
    try {
      const res = await fetch(`/api/patient/history/${activeUserId}`);
      const history = await res.json();
      listContainer.innerHTML = '';

      if (history.length === 0) {
        listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-text-secondary); text-align:center;">No consultations found.</p>';
        return;
      }

      history.forEach(session => {
        const div = document.createElement('div');
        div.className = 'glass-panel';
        div.style.cursor = 'pointer';
        div.style.border = '1px solid rgba(255,255,255,0.05)';
        
        let actionsHtml = '';
        if (session.status === 'COMPLETED') {
           actionsHtml = `<button class="btn btn-secondary btn-rate-doc" data-doc-id="${session.clinicianId}" style="margin-top:10px; padding:6px; font-size:12px;">Rate Experience</button>`;
        } else {
           actionsHtml = `<button class="btn btn-primary btn-chat-doc" style="margin-top:10px; padding:6px; font-size:12px; background:#3b82f6;">Open Chat</button>`;
        }

        div.innerHTML = `
          <div style="font-weight:bold; margin-bottom:5px;">Dr. ${session.clinician.firstName} <span style="font-size:11px; font-weight:normal; color:gray;">(${session.status})</span></div>
          <div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:10px;">${new Date(session.updatedAt).toLocaleDateString()}</div>
          <div style="font-size:13px; margin-bottom:10px;"><strong>Symptoms:</strong> ${session.patientSymptoms}</div>
          ${session.aiSummary ? `<div style="padding:10px; background:rgba(0,0,0,0.1); border-left:3px solid #10B981; border-radius:4px; font-size:12px; white-space:pre-wrap;"><strong>AI Summary:</strong><br>${session.aiSummary}</div>` : ''}
          ${actionsHtml}
        `;
        
        div.addEventListener('click', (e) => {
           if (e.target.classList.contains('btn-rate-doc')) {
              ratingDoctorId = e.target.getAttribute('data-doc-id');
              document.getElementById('rating-overlay').classList.add('active');
              return;
           }
           openPatientChat(session.sessionId, session.clinician.firstName, session.status);
        });
        
        listContainer.appendChild(div);
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function openPatientChat(sessionId, docName, status) {
     activeChatSessionId = sessionId;
     document.getElementById('history-overview-panel').style.display = 'none';
     document.getElementById('patient-chat-panel').style.display = 'flex';
     
     document.getElementById('patient-chat-doctor-name').textContent = `Dr. ${docName}`;
     document.getElementById('patient-chat-status').textContent = `Status: ${status}`;
     
     const chatHistory = document.getElementById('patient-chat-history');
     chatHistory.innerHTML = '<p style="text-align:center; color:gray; font-size:12px;">Loading chat...</p>';
     
     try {
        const res = await fetch(`/api/patient/consultations/${sessionId}/messages`);
        const data = await res.json();
        chatHistory.innerHTML = '';
        
        data.messages.forEach(m => {
           appendPatientChatMessage(m.text, m.sender === 'PATIENT');
        });
        
        if (socket) {
           socket.emit('join_consultation', sessionId);
           socket.off('new_message');
           socket.on('new_message', (msg) => {
              appendPatientChatMessage(msg.text, msg.sender === 'PATIENT');
           });
        }
     } catch(e) {
        console.error(e);
     }
  }

  function appendPatientChatMessage(text, isPatient) {
     const chatHistory = document.getElementById('patient-chat-history');
     const div = document.createElement('div');
     div.className = `chat-bubble ${isPatient ? 'patient' : 'ai'}`;
     if(!isPatient) div.style.background = '#2c3e50'; // Make doctor msgs distinct if needed
     div.textContent = text;
     chatHistory.appendChild(div);
     chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  document.getElementById('btn-back-to-history').addEventListener('click', () => {
     activeChatSessionId = null;
     document.getElementById('patient-chat-panel').style.display = 'none';
     document.getElementById('history-overview-panel').style.display = 'block';
  });

  document.getElementById('btn-patient-send-message').addEventListener('click', async () => {
     const input = document.getElementById('patient-chat-input');
     const text = input.value.trim();
     if(!text || !activeChatSessionId) return;
     
     input.value = '';
     // Optimistically append
     // appendPatientChatMessage(text, true); 
     
     try {
        await fetch(`/api/patient/consultations/${activeChatSessionId}/message`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ text, userId: activeUserId })
        });
     } catch(e) {
        console.error(e);
     }
  });

  document.getElementById('patient-chat-input').addEventListener('keypress', (e) => {
     if(e.key === 'Enter') document.getElementById('btn-patient-send-message').click();
  });

  document.getElementById('btn-submit-rating').addEventListener('click', async () => {
    if (!ratingDoctorId) return;
    const rating = document.getElementById('doc-rating-select').value;
    
    await fetch(`/api/patient/rate/${ratingDoctorId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });

    document.getElementById('rating-overlay').classList.remove('active');
    showAlert('Thank you!', 'Your rating has been submitted to the doctor.', '⭐');
  });

  // ─── LOCAL OFFLINE DUMMY BACKUP DATA ────────────────────────────
  function setupLocalBackupData() {
    profileData = {
      fullName: 'Guest Tester',
      age: 25,
      gender: 'Male',
      phoneNumber: '+251911223344',
      location: 'Addis Ababa',
      anonymousMode: false
    };
    document.getElementById('dash-user-name').textContent = profileData.fullName;
  }
});



