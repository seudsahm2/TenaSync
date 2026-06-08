/**
 * AIAssistantWidget - A modular, integratable frontend class for the AI Health Assistant.
 * Other teams (like Patient or Doctor) can instantiate this class to embed the AI chat anywhere.
 */
class AIAssistantWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`AIAssistantWidget: Container #${containerId} not found.`);
      return;
    }
    
    this.chatHistory = [];
    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="glass-panel" style="display:flex; flex-direction:column; height:calc(100vh - 180px); padding:16px; margin-bottom:0;">
        <div id="emergency-banner-${this.container.id}" class="emergency-banner hidden" style="border-radius:8px; margin-bottom:10px;">
          🚨 POTENTIAL MEDICAL EMERGENCY DETECTED. PLEASE SEEK IMMEDIATE HELP.
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
          <div>
            <h2 style="font-size:16px; margin:0; color:var(--color-primary);">AI Health Assistant</h2>
            <p style="margin:0; font-size:11px; color:var(--color-text-secondary);">Describe your symptoms to get started</p>
          </div>
        </div>
        
        <div id="chat-messages-${this.container.id}" style="flex:1; overflow-y:auto; margin:16px 0; display:flex; flex-direction:column; gap:12px; padding-right:4px;">
          <div class="chat-bubble ai">
            Hello! I am your TenaSync AI Assistant. What symptoms are you experiencing today?
          </div>
        </div>
        
        <div style="display:flex; gap:8px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);">
          <input type="text" id="symptom-input-${this.container.id}" class="form-input" style="flex:1;" placeholder="E.g., I have a headache and mild fever..." />
          <button class="btn btn-primary" id="send-btn-${this.container.id}" style="width:auto; padding:10px 16px;">➔</button>
        </div>
      </div>
    `;

    this.chatMessages = document.getElementById(`chat-messages-${this.container.id}`);
    this.symptomInput = document.getElementById(`symptom-input-${this.container.id}`);
    this.sendBtn = document.getElementById(`send-btn-${this.container.id}`);
    this.emergencyBanner = document.getElementById(`emergency-banner-${this.container.id}`);

    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.symptomInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSend();
    });
  }

  addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-bubble');
    msgDiv.classList.add(isUser ? 'patient' : 'ai');
    msgDiv.textContent = text;
    this.chatMessages.appendChild(msgDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    this.chatHistory.push(`${isUser ? 'Patient' : 'AI'}: ${text}`);
  }

  addAnalysisResults(analysis) {
    const resultsDiv = document.createElement('div');
    resultsDiv.classList.add('analysis-results');
    
    let html = `<h4>Analysis Complete</h4>
                <p><strong>Condition:</strong> ${analysis.condition}</p>
                <p><strong>Recommendation:</strong> ${analysis.recommendation}</p>`;
    
    if (analysis.followUpQuestions && analysis.followUpQuestions.length > 0) {
      html += `<p><strong>Follow-up Questions:</strong></p><ul>`;
      analysis.followUpQuestions.forEach(q => {
        html += `<li>${q}</li>`;
      });
      html += `</ul>`;
    }

    resultsDiv.innerHTML = html;
    this.chatMessages.appendChild(resultsDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async fetchSpecialists(condition) {
    try {
      const response = await fetch('/api/ai/specialists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition })
      });
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        let docs = result.data.slice(0, 3).map(c => `Dr. ${c.firstName} (${c.specialty})`).join(', ');
        this.addMessage(`I recommend speaking with one of these specialists: ${docs}`);
      }
    } catch (e) {
      console.error('Error fetching specialists:', e);
    }
  }

  async handleSend() {
    const text = this.symptomInput.value.trim();
    if (!text) return;

    this.addMessage(text, true);
    this.symptomInput.value = '';

    // Get patient user ID to send for context
    const urlParams = new URLSearchParams(window.location.search);
    let tgUserId = urlParams.get('user_id');
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
      tgUserId = window.Telegram.WebApp.initDataUnsafe.user.id.toString();
    }
    const userId = tgUserId || localStorage.getItem('webFallbackId') || '';

    const typingMsg = document.createElement('div');
    typingMsg.classList.add('chat-bubble', 'ai');
    typingMsg.textContent = 'Thinking...';
    this.chatMessages.appendChild(typingMsg);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    try {
      const contextStr = this.chatHistory.join('\n');
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: contextStr, userId })
      });

      const result = await response.json();
      this.chatMessages.removeChild(typingMsg);

      if (result.success && result.data) {
        const data = result.data;
        
        if (data.isEmergency) {
          this.emergencyBanner.classList.remove('hidden');
          this.addMessage("⚠️ " + data.recommendation);
        } else {
          this.emergencyBanner.classList.add('hidden');
          
          // Always provide the home care recommendation
          this.addMessage(data.recommendation);
          
          if (data.followUpQuestions && data.followUpQuestions.length > 0) {
            setTimeout(() => {
              const q = data.followUpQuestions[0];
              this.addMessage(q);
            }, 1500);
          } else {
            // It has concluded its diagnosis!
            setTimeout(() => {
               this.addAnalysisResults(data);
               if (data.condition !== 'Unknown') {
                 this.fetchSpecialists(data.condition);
               }
            }, 1500);
          }
        }
      } else {
        this.addMessage("Sorry, I encountered an error analyzing your symptoms.");
      }

    } catch (error) {
      console.error('Error:', error);
      this.chatMessages.removeChild(typingMsg);
      this.addMessage("Sorry, the server is currently unavailable.");
    }
  }
}

// Expose globally so other modules can use it
window.AIAssistantWidget = AIAssistantWidget;

// Auto-init if there's a div with id="ai-assistant-mount" (for backward compatibility / quick tests)
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ai-assistant-mount')) {
    new AIAssistantWidget('ai-assistant-mount');
  }
});

