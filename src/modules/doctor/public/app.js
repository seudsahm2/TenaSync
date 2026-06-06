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
        document.getElementById('profile-specialty').textContent = profile.specialty || 'Not Set';
        document.getElementById('profile-verified').textContent = profile.isVerifiedClinician ? 'Yes' : 'No';
        document.getElementById('profile-treatments').textContent = profile.treatmentOptions?.join(', ') || 'Not Set';
      }

      this.loadAvailability();

      document.getElementById('btn-add-avail').addEventListener('click', async () => {
        const day = parseInt(document.getElementById('avail-day').value);
        const start = document.getElementById('avail-start').value;
        const end = document.getElementById('avail-end').value;

        const res = await fetch('/api/doctor/availability', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ dayOfWeek: day, startTime: start, endTime: end })
        });
        if (res.ok) this.loadAvailability();
      });

    } catch (e) {
      console.error(e);
    }
  }

  async loadAvailability() {
    const list = document.getElementById('availability-list');
    list.innerHTML = 'Loading...';
    try {
      const res = await fetch(`/api/doctor/availability/${this.doctorId}`, { headers: this.getHeaders() });
      if (res.ok) {
        const slots = await res.json();
        list.innerHTML = '';
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        slots.forEach(slot => {
          const li = document.createElement('li');
          li.style.marginBottom = '5px';
          li.innerHTML = `<strong>${days[slot.dayOfWeek]}</strong>: ${slot.startTime} - ${slot.endTime} 
                          <button class="btn btn-danger" style="padding: 2px 5px; font-size:12px; margin-left: 10px;" onclick="window.doctorApp.deleteSlot('${slot.id}')">Delete</button>`;
          list.appendChild(li);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async deleteSlot(slotId) {
    await fetch(`/api/doctor/availability/${slotId}`, { method: 'DELETE', headers: this.getHeaders() });
    this.loadAvailability();
  }

  // --- Patients View ---
  async initPatients() {
    try {
      const res = await fetch('/api/doctor/patients', { headers: this.getHeaders() });
      if (res.ok) {
        const patients = await res.json();
        const tbody = document.getElementById('patient-list');
        tbody.innerHTML = '';
        patients.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${p.firstName}</td>
            <td>${p.telegramId}</td>
            <td>${new Date(p.lastConsultation).toLocaleDateString()}</td>
            <td><button class="btn">View History</button></td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Consultations View ---
  async initConsultations() {
    this.activeSessionId = null;
    try {
      const res = await fetch('/api/doctor/consultations', { headers: this.getHeaders() });
      if (res.ok) {
        const cons = await res.json();
        const list = document.getElementById('consultation-list');
        list.innerHTML = '';
        
        if (cons.length === 0) list.innerHTML = '<p style="padding:15px;">No consultations</p>';

        cons.forEach(c => {
          const div = document.createElement('div');
          div.className = 'consultation-item';
          div.innerHTML = `<strong>${c.patient.firstName}</strong><br>
                           <span style="font-size:0.8em; color:gray;">${c.status}</span>`;
          div.addEventListener('click', () => {
            document.querySelectorAll('.consultation-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
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

        data.messages.forEach(m => {
          const msgDiv = document.createElement('div');
          msgDiv.className = `chat-message ${m.sender === 'CLINICIAN' ? 'msg-doctor' : 'msg-patient'}`;
          msgDiv.textContent = m.text;
          history.appendChild(msgDiv);
        });

        history.scrollTop = history.scrollHeight;

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
          
          this.loadConsultationDetail(sessionId);
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
          const tbody = document.getElementById('document-list');
          tbody.innerHTML = '';
          docs.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${d.title}</td>
              <td>${new Date(d.createdAt).toLocaleDateString()}</td>
              <td><button class="btn btn-danger" onclick="window.doctorApp.deleteDocument('${d.id}')">Delete</button></td>
            `;
            tbody.appendChild(tr);
          });
        }
      };

      await loadDocs();

      document.getElementById('btn-upload-doc').addEventListener('click', async () => {
        const title = document.getElementById('doc-title').value;
        const content = document.getElementById('doc-content').value;
        if (!title || !content) return alert("Title and content required.");

        const res = await fetch('/api/doctor/documents', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ title, content })
        });

        if (res.ok) {
          document.getElementById('doc-title').value = '';
          document.getElementById('doc-content').value = '';
          loadDocs();
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

export function initDoctorModule() {
  console.log("Doctor module initiated programmatically.");
}
