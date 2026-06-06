// TenaSync Frontend Client APIs

const API_BASE = '/api';

/**
 * Match clinicians based on patient symptoms
 */
async function matchClinicians(symptoms) {
  try {
    const res = await fetch(`${API_BASE}/clinicians/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms })
    });
    if (!res.ok) throw new Error('Failed to match clinicians');
    return await res.json();
  } catch (err) {
    console.error('API Error: matchClinicians:', err);
    throw err;
  }
}

/**
 * Start a symptom consultation with a clinician
 */
async function startConsultation(data) {
  try {
    const res = await fetch(`${API_BASE}/consultation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to start consultation');
    return await res.json();
  } catch (err) {
    console.error('API Error: startConsultation:', err);
    throw err;
  }
}

/**
 * Dispatch anonymous postpartum coach request
 */
async function dispatchConfidentialReferral(data) {
  try {
    const res = await fetch(`${API_BASE}/maternal/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Dispatch request failed');
    return await res.json();
  } catch (err) {
    console.error('API Error: dispatchConfidentialReferral:', err);
    throw err;
  }
}
