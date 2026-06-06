// ጤና-Sync Patient Mini App Logic (Eyob's Module)

document.addEventListener('DOMContentLoaded', () => {
  // ─── STATE MANAGEMENT ───────────────────────────────────────────
  let activeUserId = null;
  let profileData = null;
  let dashboardStats = null;
  let currentAppTab = 'active'; // 'active', 'completed', 'cancelled'
  let selectedDoctor = null; // Store doctor selection for booking

  // Parse user_id from Telegram URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  let tgUserId = urlParams.get('user_id');

  // Try to use secure Telegram WebApp SDK if available
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
    tgUserId = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
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
      views[key].classList.remove('active');
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
    } finally {
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.textContent = 'Connect Account';
      }
    }
  }

  btnLoginSubmit.addEventListener('click', () => {
    connectAccount(document.getElementById('login-telegram-id').value.trim());
  });

  // Auto-connect if user ID is found securely via Telegram
  if (tgUserId) {
    connectAccount(tgUserId);
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
    document.getElementById('dash-user-name').textContent = profileData.fullName || 'Patient ' + activeUserId.slice(-4);
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
  const chatSendBtn = document.getElementById('btn-chat-send');
  const chatMsgInput = document.getElementById('chat-message-input');
  const chatContainer = document.getElementById('chat-messages-container');

  chatSendBtn.addEventListener('click', async () => {
    const symptomsText = chatMsgInput.value.trim();
    const durationText = document.getElementById('chat-input-duration').value.trim();
    const severitySelect = document.getElementById('chat-input-severity').value;

    if (!symptomsText) return;

    // Render patient bubble
    appendChatBubble('patient', symptomsText);
    chatMsgInput.value = '';

    // Add a temporary typing delay bubble
    const typingBubble = appendChatBubble('ai', 'Thinking...');

    try {
      // Search matching doctors based on symptoms
      const matchRes = await fetch('/api/clinicians/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: symptomsText })
      });
      const doctors = await matchRes.json();

      // Simulate deep AI health report alignment
      setTimeout(() => {
        typingBubble.remove();

        // Formulate AI reply
        let reply = `Based on your described symptoms: "${symptomsText}" (Duration: ${durationText || 'Unspecified'}, Severity: ${severitySelect}), `;
        reply += `I suspect a possible posture-related alignment stress. I strongly advise taking passive stretching breaks and extensions. `;
        reply += `I have prepared a medical report for you. Please tap below to view the results.`;

        appendChatBubble('ai', reply);

        // Open Report results
        setTimeout(() => {
          document.getElementById('res-possible-issue').textContent = symptomsText.toLowerCase().includes('neck') ? 'Cervical Spine Strain' : 'Lumbar Joint Compression';
          document.getElementById('res-risk-level').className = severitySelect === 'Severe' ? 'results-risk-badge badge-red' : 'results-risk-badge badge-amber';
          document.getElementById('res-risk-level').textContent = `${severitySelect.toUpperCase()} RISK`;
          document.getElementById('res-recommended-action').textContent = `We recommend scheduling a consultation with a somatic specialist. Avoid lifting heavy objects for 48 hours.`;

          showView('chatResults');
        }, 3000);

      }, 1500);

    } catch (err) {
      typingBubble.textContent = "I'm experiencing connectivity issues. Please try again soon.";
    }
  });

  document.getElementById('btn-res-dismiss').addEventListener('click', () => {
    showView('dashboard');
  });
  document.getElementById('btn-res-find-doctor').addEventListener('click', () => {
    fetchSpecialists();
    showView('specialists');
  });

  function appendChatBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return bubble;
  }

  // ─── SPECIALISTS & BOOKING LOGIC ─────────────────────────────────
  async function fetchSpecialists() {
    const listContainer = document.getElementById('specialists-list-container');
    listContainer.innerHTML = '<p style="font-size:13px; color:var(--color-text-secondary); text-align:center;">Loading vetted specialists...</p>';

    try {
      // Hits the root matching API which returns clinicians list
      const res = await fetch('/api/clinicians/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: 'general' })
      });
      const doctors = await res.json();

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
    document.querySelector('.tab-navigation').style.display = 'none';
    showView('login');
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
