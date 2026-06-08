// Doctor Module Frontend Logic
console.log('Doctor module loaded');

class DoctorDashboard {
  constructor() {
    this.doctorId = localStorage.getItem('mockDoctorId') || '';
    this.currentView = 'dashboard';
    
    this.initElements();
    this.bindEvents();
    this.autoLoginWithTelegram();
  }

  async autoLoginWithTelegram() {
    // Check if running inside Telegram Web App
    let tgUserId = null;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
      tgUserId = window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
      // Fallback to URL params
      const urlParams = new URLSearchParams(window.location.search);
      tgUserId = urlParams.get('user_id');
    }

    if (tgUserId) {
      try {
        const res = await fetch(`/api/doctor/telegram/${tgUserId}`);
        if (res.ok) {
          const data = await res.json();
          this.doctorId = data.id;
          localStorage.setItem('mockDoctorId', this.doctorId);
          this.mockDoctorIdInput.value = this.doctorId;
          this.loadProfile();
          this.switchView('dashboard');
          return;
        } else {
          alert('Your account is not verified as a Doctor. Please return to the Patient portal to upgrade.');
        }
      } catch (e) {
        console.error('Auto login failed', e);
      }
    }

    // If auto-login fails, check if we had a saved one
    if (this.doctorId) {
      this.mockDoctorIdInput.value = this.doctorId;
      this.loadProfile();
      this.switchView('dashboard');
    }
  }

  initElements() {
    this.contentArea = document.getElementById('content-area');
    this.viewTitle = document.getElementById('view-title');
    this.doctorNameEl = document.getElementById('doctor-name');
    this.mockDoctorIdInput = document.getElementById('mock-doctor-id');
    this.btnLogin = document.getElementById('btn-login');
    this.navItems = document.querySelectorAll('.nav-item');
  }

  bindEvents() {
    this.btnLogin.addEventListener('click', () => {
      const id = this.mockDoctorIdInput.value.trim();
      if (id) {
        this.doctorId = id;
        localStorage.setItem('mockDoctorId', id);
        this.loadProfile();
        this.switchView('dashboard');
      }
    });

    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        if (!this.doctorId) return alert("Please enter Doctor ID and Login first.");
        
        this.navItems.forEach(n => n.classList.remove('active'));
        e.target.classList.add('active');
        
        const view = e.target.getAttribute('data-view');
        this.switchView(view);
      });
    });
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-doctor-id': this.doctorId
    };
  }

  async loadProfile() {
    try {
      const res = await fetch(`/api/doctor/profile/${this.doctorId}`, { headers: this.getHeaders() });
      if (res.ok) {
        const profile = await res.json();
        this.doctorNameEl.textContent = `Dr. ${profile.firstName}`;
      } else {
        this.doctorNameEl.textContent = "Profile not found";
      }
    } catch (e) {
      console.error(e);
    }
  }

  switchView(view) {
    this.currentView = view;
    this.viewTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
    
    const tpl = document.getElementById(`tpl-${view}`).innerHTML;
    this.contentArea.innerHTML = tpl;

    if (view === 'dashboard') this.initDashboard();
    if (view === 'patients') this.initPatients();
    if (view === 'consultations') this.initConsultations();
    if (view === 'documents') this.initDocuments();
  }

  // --- Dashboard View ---
  async initDashboard() {
    try {
      // Load Stats
      const statsRes = await fetch(`/api/doctor/profile/${this.doctorId}/stats`, { headers: this.getHeaders() });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        document.getElementById('stat-patients').textContent = stats.totalPatients || 0;
        document.getElementById('stat-active-consultations').textContent = stats.activeConsultations || 0;
        document.getElementById('stat-total-consultations').textContent = stats.completedConsultations || 0;
      }

      // Load Profile Info
      const profileRes = await fetch(`/api/doctor/profile/${this.doctorId}`, { headers: this.getHeaders() });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        document.getElementById('profile-specialty').value = profile.specialty || '';
        document.getElementById('profile-verified').textContent = profile.isVerifiedClinician ? 'Yes' : 'No';
        document.getElementById('profile-treatments').value = profile.treatmentOptions?.join(', ') || '';
      }

      const updateBtn = document.getElementById('btn-update-profile');
      if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
          updateBtn.disabled = true;
          updateBtn.textContent = 'Updating...';
          const spec = document.getElementById('profile-specialty').value.trim();
          const treat = document.getElementById('profile-treatments').value.split(',').map(s=>s.trim()).filter(Boolean);
          
          await fetch(`/api/doctor/profile/${this.doctorId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ specialty: spec, treatmentOptions: treat })
          });
          
          updateBtn.disabled = false;
          updateBtn.textContent = 'Update Profile';
          alert('Profile Updated Successfully!');
        });
      }

      this.initCalendarGrid();

    } catch (e) {
      console.error(e);
    }
  }

  async initCalendarGrid() {
    this.calendarSlots = []; // Array of objects { dayOfWeek, startTime, endTime }
    
    // Fetch existing slots from backend
    try {
      const res = await fetch(`/api/doctor/availability/${this.doctorId}`, { headers: this.getHeaders() });
      if (res.ok) {
        this.calendarSlots = await res.json();
      }
    } catch(e) {
      console.error("Failed to load availability", e);
    }

    const intervalSelect = document.getElementById('slot-interval');
    if (intervalSelect) {
      intervalSelect.addEventListener('change', () => {
        this.renderCalendarGrid(parseInt(intervalSelect.value));
      });
      this.renderCalendarGrid(parseInt(intervalSelect.value));
    }

    const btnSave = document.getElementById('btn-save-calendar');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        btnSave.disabled = true;
        btnSave.textContent = 'Saving...';
        
        try {
          // Clear old slots via API (bulk delete not implemented natively in routes, but we can do it)
          await fetch('/api/doctor/availability/bulk', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ slots: this.calendarSlots })
          });
          
          alert('Weekly Calendar Saved Successfully! Your patients can now book these slots.');
        } catch (e) {
          alert('Failed to save calendar.');
        } finally {
          btnSave.disabled = false;
          btnSave.textContent = '💾 Save Calendar Layout';
        }
      });
    }
  }

  renderCalendarGrid(intervalMins) {
    const grid = document.getElementById('weekly-calendar-grid');
    if (!grid) return;

    // Reset grid content to keep only headers
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

    // Generate times from 08:00 to 18:00
    const startHour = 8;
    const endHour = 18;
    const totalMins = (endHour - startHour) * 60;
    const totalRows = Math.ceil(totalMins / intervalMins);

    for (let row = 0; row < totalRows; row++) {
      const currentMins = (startHour * 60) + (row * intervalMins);
      const nextMins = currentMins + intervalMins;
      
      const hr1 = Math.floor(currentMins / 60).toString().padStart(2, '0');
      const m1 = (currentMins % 60).toString().padStart(2, '0');
      const hr2 = Math.floor(nextMins / 60).toString().padStart(2, '0');
      const m2 = (nextMins % 60).toString().padStart(2, '0');

      const timeLabel = `${hr1}:${m1}`;
      const timeEnd = `${hr2}:${m2}`;

      // Time Column
      const timeDiv = document.createElement('div');
      timeDiv.style.fontSize = '10px';
      timeDiv.style.color = 'gray';
      timeDiv.style.textAlign = 'right';
      timeDiv.style.paddingRight = '5px';
      timeDiv.style.marginTop = '2px';
      timeDiv.textContent = timeLabel;
      grid.appendChild(timeDiv);

      // Days 1-7 (Mon-Sun)
      for (let day = 1; day <= 7; day++) {
        // Map 7 (Sunday) back to 0 for backend DayOfWeek logic
        const backendDay = day === 7 ? 0 : day;
        
        const cell = document.createElement('div');
        cell.style.background = 'rgba(255,255,255,0.03)';
        cell.style.border = '1px solid rgba(255,255,255,0.05)';
        cell.style.borderRadius = '4px';
        cell.style.height = '24px';
        cell.style.cursor = 'pointer';
        cell.style.transition = 'all 0.2s';
        
        // Check if this slot is active in existing this.calendarSlots
        const isSelected = this.calendarSlots.some(s => s.dayOfWeek === backendDay && s.startTime === timeLabel);
        if (isSelected) {
           cell.style.background = 'rgba(16, 185, 129, 0.4)';
           cell.style.borderColor = 'var(--color-success)';
        }

        cell.addEventListener('click', () => {
          const idx = this.calendarSlots.findIndex(s => s.dayOfWeek === backendDay && s.startTime === timeLabel);
          if (idx > -1) {
            this.calendarSlots.splice(idx, 1);
            cell.style.background = 'rgba(255,255,255,0.03)';
            cell.style.borderColor = 'rgba(255,255,255,0.05)';
          } else {
            this.calendarSlots.push({ dayOfWeek: backendDay, startTime: timeLabel, endTime: timeEnd, isAvailable: true });
            cell.style.background = 'rgba(16, 185, 129, 0.4)';
            cell.style.borderColor = 'var(--color-success)';
          }
        });

        grid.appendChild(cell);
      }
    }
  }

  // --- Patients View ---
  async initPatients() {
    try {
      const res = await fetch('/api/doctor/patients', { headers: this.getHeaders() });
      if (res.ok) {
        const patients = await res.json();
        const list = document.getElementById('patient-list');
        list.innerHTML = '';
        if (patients.length === 0) list.innerHTML = '<p style="font-size:12px; color:gray;">No patients assigned.</p>';

        patients.forEach(p => {
          const div = document.createElement('div');
          div.className = 'clinician-item'; // reuse nice CSS class
          div.innerHTML = `
            <div>
              <div style="font-weight:600; font-size:14px;">${p.firstName}</div>
              <div style="font-size:11px; color:gray;">ID: ${p.telegramId}</div>
              <div style="font-size:11px; color:gray;">Last Visit: ${new Date(p.lastConsultation).toLocaleDateString()}</div>
            </div>
            <button class="btn btn-secondary btn-history" data-patient="${p.id}" style="width:auto; padding:6px 12px; font-size:11px;">History</button>
          `;
          
          div.querySelector('.btn-history').addEventListener('click', async () => {
            const hRes = await fetch(`/api/doctor/patients/${p.id}/history`, { headers: this.getHeaders() });
            if (hRes.ok) {
              const hist = await hRes.json();
              if(hist.length === 0) {
                 alert('No past history found for this patient.');
                 return;
              }
              let histStr = `Patient History for ${p.firstName}:\n\n`;
              hist.forEach(h => {
                histStr += `- ${new Date(h.createdAt).toLocaleDateString()}: ${h.patientSymptoms} (${h.status})\n`;
              });
              alert(histStr);
            }
          });
          
          list.appendChild(div);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Consultations View ---
  getSocket() {
     if(!this.socket && typeof io !== 'undefined') {
        this.socket = io();
     }
     return this.socket;
  }

  async initConsultations() {
    this.activeSessionId = null;
    try {
      const res = await fetch('/api/doctor/consultations', { headers: this.getHeaders() });
      if (res.ok) {
        const cons = await res.json();
        const list = document.getElementById('consultation-list');
        list.innerHTML = '';
        
        if (cons.length === 0) list.innerHTML = '<p style="padding:15px;">No active consultations</p>';

        cons.forEach(c => {
          const div = document.createElement('div');
          div.className = 'consultation-item';
          // Style it like a mini avatar card
          div.style.minWidth = '120px';
          div.style.padding = '10px';
          div.style.background = 'rgba(255,255,255,0.05)';
          div.style.borderRadius = '8px';
          div.style.cursor = 'pointer';
          div.style.border = '1px solid rgba(255,255,255,0.1)';

          div.innerHTML = `<div style="font-weight:600; font-size:13px;">${c.patient.firstName}</div>
                           <div style="font-size:10px; color:var(--color-accent); margin-top:4px;">${c.status}</div>`;
          div.addEventListener('click', () => {
            document.querySelectorAll('.consultation-item').forEach(el => el.style.borderColor = 'rgba(255,255,255,0.1)');
            div.style.borderColor = 'var(--color-success)';
            this.loadConsultationDetail(c.sessionId);
          });
          list.appendChild(div);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async loadConsultationDetail(sessionId) {
    this.activeSessionId = sessionId;
    document.getElementById('chat-area').style.display = 'flex';
    
    try {
      const res = await fetch(`/api/doctor/consultations/${sessionId}`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        document.getElementById('chat-patient-name').textContent = data.patient.firstName;
        document.getElementById('chat-status').textContent = `Status: ${data.status} | Auto-Reply: ${data.autoReplyEnabled ? 'ON' : 'OFF'}`;
        
        // Show AI Summary if exists! (Integration with AI Module)
        const summaryBox = document.getElementById('ai-summary-box');
        if (data.aiSummary) {
           summaryBox.style.display = 'block';
           document.getElementById('ai-summary-text').textContent = data.aiSummary;
        } else {
           summaryBox.style.display = 'none';
        }

        const history = document.getElementById('chat-history');
        // Clear all but summary
        Array.from(history.children).forEach(c => {
          if (c.id !== 'ai-summary-box') c.remove();
        });

        const appendMsg = (text, isDoctor) => {
          const msgDiv = document.createElement('div');
          // Use the global glassmorphism chat-bubble classes instead of legacy ones
          msgDiv.className = `chat-bubble ${isDoctor ? 'patient' : 'ai'}`;
          if (isDoctor) msgDiv.style.background = '#3b82f6'; // distinct color for doctor sender
          msgDiv.textContent = text;
          history.appendChild(msgDiv);
          history.scrollTop = history.scrollHeight;
        };

        data.messages.forEach(m => {
          appendMsg(m.text, m.sender === 'CLINICIAN');
        });

        const socket = this.getSocket();
        if(socket) {
           socket.emit('join_consultation', sessionId);
           socket.off('new_message');
           socket.on('new_message', (m) => {
              appendMsg(m.text, m.sender === 'CLINICIAN');
           });
        }

        // Bind Takeover
        const takeoverBtn = document.getElementById('btn-takeover');
        takeoverBtn.onclick = async () => {
          await fetch(`/api/doctor/consultations/${sessionId}/takeover`, { method: 'POST', headers: this.getHeaders() });
          this.loadConsultationDetail(sessionId);
        };

        // Bind Send Message
        const sendBtn = document.getElementById('btn-send-message');
        const input = document.getElementById('chat-input-text');
        
        const sendHandler = async () => {
          const text = input.value.trim();
          if (!text) return;
          input.value = '';
          
          await fetch(`/api/doctor/consultations/${sessionId}/message`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ text })
          });
        };

        sendBtn.onclick = sendHandler;
        input.onkeypress = (e) => { if(e.key==='Enter') sendHandler(); };
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Documents View ---
  async initDocuments() {
    try {
      const loadDocs = async () => {
        const res = await fetch('/api/doctor/documents', { headers: this.getHeaders() });
        if (res.ok) {
          const docs = await res.json();
          const list = document.getElementById('document-list');
          list.innerHTML = '';
          if(docs.length === 0) list.innerHTML = '<p style="font-size:12px; color:gray;">No documents uploaded.</p>';
          
          docs.forEach(d => {
            const div = document.createElement('div');
            div.className = 'clinician-item';
            div.innerHTML = `
              <div>
                <div style="font-size:14px; font-weight:600;">${d.title}</div>
                <div style="font-size:11px; color:gray;">${new Date(d.createdAt).toLocaleDateString()}</div>
              </div>
              <button class="btn btn-danger" style="width:auto; padding:6px 12px; font-size:11px;" onclick="window.doctorApp.deleteDocument('${d.id}')">Delete</button>
            `;
            list.appendChild(div);
          });
        }
      };

      await loadDocs();

      const fileInput = document.getElementById('dash-doc-file');
      const dropzone = document.getElementById('dash-file-dropzone');
      const fileNameDisplay = document.getElementById('dash-file-name');
      const uploadBtn = document.getElementById('btn-upload-doc');

      if (dropzone) {
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
            fileNameDisplay.innerHTML = `✓ ${fileInput.files[0].name} attached`;
          }
        });
      }

      async function extractTextFromFile(file) {
        return new Promise((resolve, reject) => {
          if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = async function() {
              const typedarray = new Uint8Array(this.result);
              try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                }
                resolve(fullText);
              } catch (e) {
                reject(e);
              }
            };
            reader.readAsArrayBuffer(file);
          } else {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file);
          }
        });
      }

      uploadBtn.addEventListener('click', async () => {
        const title = document.getElementById('doc-title').value.trim();
        const file = fileInput.files[0];
        if (!title || !file) return alert("Title and a document are required.");

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Processing PDF...';

        try {
          const content = await extractTextFromFile(file);
          uploadBtn.textContent = 'Uploading...';

          const res = await fetch('/api/doctor/documents', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ title, content })
          });

          if (res.ok) {
            document.getElementById('doc-title').value = '';
            fileInput.value = '';
            fileNameDisplay.innerHTML = '';
            loadDocs();
            alert('Guideline successfully uploaded & processed for your AI!');
          } else {
            alert('Upload failed.');
          }
        } catch (e) {
          console.error(e);
          alert('Error extracting text: ' + e.message);
        } finally {
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Upload Guideline';
        }
      });

      this.loadDocsFn = loadDocs;
    } catch (e) {
      console.error(e);
    }
  }

  async deleteDocument(docId) {
    await fetch(`/api/doctor/documents/${docId}`, { method: 'DELETE', headers: this.getHeaders() });
    if (this.loadDocsFn) this.loadDocsFn();
  }
}

// Global instance for inline onclick handlers
document.addEventListener('DOMContentLoaded', () => {
  window.doctorApp = new DoctorDashboard();
});

function initDoctorModule() {
  console.log("Doctor module initiated programmatically.");
}

