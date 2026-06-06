# AI Health Assistant - Integration Guide

This guide explains how other teams (Doctor, Patient, Specialized) can easily integrate the AI Health Assistant module into their parts of the application.

## 1. Backend Integration (Node.js)

If you are working on backend logic and need to use the AI Engine (for example, generating a summary or doing an emergency check), you do not need to make HTTP requests. You can import the service directly:

```typescript
import { AIAssistantService } from '../ai_assistant/index.js';

// Example: Generate a patient summary and save it to the DB
const summary = await AIAssistantService.generateSummary(consultationId);
console.log("Generated Summary:", summary);

// Example: Check if symptoms match an emergency
const isEmergency = await AIAssistantService.detectEmergency("I am having sharp chest pains and cannot breathe");
if (isEmergency) {
    // Trigger your module's emergency protocol
}
```

## 2. Frontend Integration (Browser JS)

If you are building a frontend view (like the Patient Dashboard) and want to embed the AI Chat interface, you can use the modular `AIAssistantWidget`.

**Step 1:** Include the AI module scripts and styles in your HTML page:
```html
<link rel="stylesheet" href="/modules/ai_assistant/style.css">
<script src="/modules/ai_assistant/app.js"></script>
```

**Step 2:** Place a mount point `div` exactly where you want the chat to appear:
```html
<!-- The chat UI will be injected inside this div -->
<div id="my-custom-chat-container"></div>
```

**Step 3:** Initialize the widget in your Javascript:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Pass the ID of the container you created
    const aiChat = new window.AIAssistantWidget('my-custom-chat-container');
});
```

That's it! The widget automatically handles all the HTML rendering, styling, typing animations, and API calls to the backend without you needing to write any AI logic.

## 3. Database Interoperability

The `AIAssistantService.generateSummary(consultationId)` method automatically updates the `ConsultationSession` model in Prisma.
If you are building the **Doctor Module**, you can retrieve the generated summary simply by querying:

```typescript
const consultation = await prisma.consultationSession.findUnique({
  where: { id: someId }
});
console.log("AI Summary for Doctor:", consultation.aiSummary);
```
