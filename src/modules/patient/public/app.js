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

  if (tgUserId) {
    document.getElementById('login-telegram-id').value = tgUserId;
  }

  // ─── DOM ELEMENTS ──────────────────────────────────────────────
  const navDash = document.getElementById('nav-dash');
  const navProfile = document.getElementById('nav-profile');
  const navRecovery = document.getElementById('nav-recovery');
  const navAppointments = document.getElementById('nav-appointments');
  const navSettings = document.getElementById('nav-settings');

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

  navSettings.addEventListener('click', () => {
    if (!activeUserId) return;
    fetchProfile(); // Load toggles state
    showView('settings');
  });

  // ─── LOGIN / ACCOUNT CONNECTION ─────────────────────────────────
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  
  async function connectAccount(tgIdInput) {
    if (!tgIdInput) {
      showAlert('Error', 'Please enter a valid Telegram User ID.', '❌');
      return;
    }

    activeUserId = tgIdInput;
    if (btnLoginSubmit) {
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.textContent = 'Connecting...';
    }

    try {
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
    } finally {
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Connect Account';
      }
    }
  }

  if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', () => {
      connectAccount(document.getElementById('login-telegram-id').value.trim());
    });
  }

  // Auto-connect if user ID is found securely via Telegram
  if (tgUserId) {
    // Hide the login UI completely while auto-connecting
    document.getElementById('view-login').innerHTML = `
      <div style="text-align:center; padding-top: 40vh; color: var(--color-primary);">
        <h2>Authenticating securely...</h2>
        <p>Connecting to Telegram...</p>
      </div>
    `;
    connectAccount(tgUserId);
  } else {
    // If absolutely no TG ID is found (e.g. opened in browser), auto-generate a fallback ID and save it so it doesn't change on reload.
    let fallbackId = localStorage.getItem('webFallbackId');
    if (!fallbackId) {
      fallbackId = 'web_' + Math.floor(Math.random() * 1000000000);
      localStorage.setItem('webFallbackId', fallbackId);
    }
    
    document.getElementById('view-login').innerHTML = `
      <div style="text-align:center; padding-top: 40vh; color: var(--color-primary);">
        <h2>Initializing Workspace...</h2>
      </div>
    `;
    connectAccount(fallbackId);
  }

  // ─── PROFILE LOGIC ──────────────────────────────────────────────
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
    document.getElementById('prof-conditions').value = profileData.existingConditions || '';
    document.getElementById('prof-allergies').value = profileData.allergies || '';
    document.getElementById('prof-medications').value = profileData.currentMedications || '';
    document.getElementById('prof-injuries').value = profileData.previousInjuries || '';

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
      existingConditions: document.getElementById('prof-conditions').value.trim(),
      allergies: document.getElementById('prof-allergies').value.trim(),
      currentMedications: document.getElementById('prof-medications').value.trim(),
      previousInjuries: document.getElementById('prof-injuries').value.trim(),
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
          body: JSON.stringify({ question: questionText, language: lang })
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

  async function fetchSpecialists(condition = 'general') {
    const listContainer = document.getElementById('specialists-list-container');
    listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-text-secondary); text-align:center;">Loading vetted specialists...</p>';

    try {
      // Use the advanced AI specialist matching API
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

  async function fetchHistory() {
    const listContainer = document.getElementById('history-list-container');
    try {
      const res = await fetch(`/api/patient/history/${activeUserId}`);
      const history = await res.json();
      listContainer.innerHTML = '';

      if (history.length === 0) {
        listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-text-secondary); text-align:center;">No completed consultations.</p>';
        return;
      }

      history.forEach(session => {
        const div = document.createElement('div');
        div.className = 'glass-panel';
        div.innerHTML = `
          <div style="font-weight:bold; margin-bottom:5px;">Dr. ${session.clinician.firstName}</div>
          <div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:10px;">${new Date(session.updatedAt).toLocaleDateString()}</div>
          <div style="font-size:13px; margin-bottom:10px;"><strong>Symptoms:</strong> ${session.patientSymptoms}</div>
          <div style="padding:10px; background:rgba(0,0,0,0.1); border-left:3px solid #10B981; border-radius:4px; font-size:12px; white-space:pre-wrap;">
            <strong>AI Doctor Summary:</strong><br>${session.aiSummary || 'No summary available.'}
          </div>
          <button class="btn btn-secondary btn-rate-doc" data-doc-id="${session.clinicianId}" style="margin-top:10px; padding:6px; font-size:12px;">Rate Experience</button>
        `;
        listContainer.appendChild(div);
      });

      document.querySelectorAll('.btn-rate-doc').forEach(btn => {
        btn.addEventListener('click', (e) => {
          ratingDoctorId = e.target.getAttribute('data-doc-id');
          document.getElementById('rating-overlay').classList.add('active');
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

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

