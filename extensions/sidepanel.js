const $ = (id) => document.getElementById(id);
let selectedTemplate = 'legacy';
let filePayload = null;

const templates = {
  legacy: 'Lead with continuity, gratitude, trust built over time, and a calm in-person advisory experience. Avoid unnecessary jargon or pressure.',
  spanish: 'Use warm, natural Spanish first. Be respectful, plain-spoken, culturally aware, and make room for family questions and decision-making.',
  family: 'Center the conversation on family, shared values, stewardship, legacy, and the people the member wants to protect.',
  transition: 'Lead with empathy and patience. Acknowledge change before financial topics, identify practical next steps, and avoid assuming what the member needs.'
};

chrome.storage.local.get(['geminiApiKey'], ({ geminiApiKey }) => { if (geminiApiKey) $('apiKey').value = geminiApiKey; });
$('settingsButton').onclick = () => $('settings').classList.toggle('hidden');
$('saveKey').onclick = async () => { await chrome.storage.local.set({ geminiApiKey: $('apiKey').value.trim() }); $('settings').classList.add('hidden'); };

document.querySelectorAll('[data-template]').forEach(button => button.onclick = () => {
  selectedTemplate = button.dataset.template;
  document.querySelectorAll('[data-template]').forEach(b => b.classList.toggle('active', b === button));
});
document.querySelector('[data-template="legacy"]').classList.add('active');

$('document').addEventListener('change', async (event) => {
  const file = event.target.files[0]; filePayload = null;
  $('fileName').textContent = file ? file.name : 'Optional: PDF, Word, or text';
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) { $('fileName').textContent = 'Please choose a file under 15 MB'; return; }
  const data = await file.arrayBuffer();
  filePayload = { mimeType: file.type || 'application/octet-stream', data: arrayBufferToBase64(data), name: file.name };
});

function arrayBufferToBase64(buffer) { let binary = ''; const bytes = new Uint8Array(buffer); for (let i=0; i<bytes.length; i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(binary); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function renderMarkdown(text) { let s = escapeHtml(text); s = s.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h3>$1</h3>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>'); s = s.replace(/(?:^|\n)[•*-] (.*)(?=(?:\n[•*-] |\n\n|$))/g,'<li>$1</li>'); s = s.replace(/(<li>[\s\S]*?<\/li>)/g,'<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g,''); return s.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>'); }

$('meetingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  // API keys are entered through the Settings panel and saved in extension-local storage.
  // A static Chrome extension cannot read the repository's .env file at runtime.
  const key = $('apiKey').value.trim();
  if (!key) {
    $('settings').classList.remove('hidden');
    $('apiKey').focus();
    $('outputTitle').textContent = 'Add your Gemini API key';
    $('result').textContent = 'Click Save key in the Settings panel, then generate the meeting brief again.';
    $('output').classList.remove('hidden');
    return;
  }
  const button = document.querySelector('.generate'); button.disabled = true; button.innerHTML = 'Creating trusted talking points…';
  const memberName = $('memberName').value.trim();
  const prompt = `You are ThriveAI, an executive assistant and meeting-preparation partner for a Thrivent financial advisor. Build a specific, practical, relationship-first MEETING PREP BRIEF that the advisor can use in a live meeting with ${memberName}.

This is preparation support, not financial advice. Never invent account balances, products, suitability, performance, tax outcomes, or personal facts. Do not recommend a specific financial product, transaction, allocation, or action. Use only stated information. Do not infer financial needs, risk tolerance, immigration status, beliefs, or preferences from country/region of origin, language, ethnicity, or family structure. Country/region may only guide respectful language, cultural curiosity, and an invitation for the member to share what matters.

Write in a concise, warm executive-assistant tone. Every section must use bullets; do not write paragraphs. Use these exact section headings and fulfill the instructions:

### Meeting objective
- Give 2 specific outcomes the advisor should aim for.

### How to greet and open
- Give 3 short, natural opening lines the advisor can say.
- Start with relationship, gratitude, or a genuine personal check-in before finances.

### What to mention
- Give 4–6 personalized talking points grounded in the supplied intelligence.
- Phrase each as something the advisor can say or gently introduce.

### Recommended conversation flow
- Give 4–5 ordered steps for the meeting, from reconnecting through next steps.

### Questions to listen for
- Give 5 open-ended questions that surface priorities, concerns, decision-makers, and preferences.

### Advisor recommendations
- Give 3–4 meeting-strategy recommendations: how to communicate, what to clarify, who to include, or what follow-up to offer.
- These must be process/relationship recommendations, never investment or product advice.

### Bilingual phrasing
- Give 3 brief English / natural neutral Spanish pairs relevant to this meeting. If the requested language is English, still include only 1 optional Spanish courtesy phrase.

### Close and follow-up
- Give 2 respectful closing lines and 2 clear follow-up actions.

### Advisor guardrails
- Give 2–3 relevant reminders about confirmation, suitability, documentation, or compliance.

Member: ${memberName}
Meeting: ${$('meetingType').value}
Member preference: ${$('memberPreference').value}
Language requested: ${$('language').value}
Life stage: ${$('lifeStage').value}
Country/region of origin, if stated by member: ${$('origin').value || 'Not provided'}
Client intelligence: ${$('context').value || 'No additional notes provided.'}
Advisor intelligence: ${$('advisorIntel').value || 'No advisor intelligence provided.'}
Conversation approach: ${templates[selectedTemplate]}

If the attached notes conflict with the stated information, flag the discrepancy under Advisor guardrails rather than assume.`;
  const parts = [{ text: prompt }];
  if (filePayload) parts.push({ inline_data: { mime_type: filePayload.mimeType, data: filePayload.data } });
  try {
    // Gemini 2.0 Flash was retired; use the currently available Flash model.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{parts}], generationConfig:{temperature:.55,maxOutputTokens:1200} }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || 'Gemini could not generate the brief.');
    const text = body.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'No meeting brief was returned.';
    $('outputTitle').textContent = `${memberName} · meeting brief`; $('result').innerHTML = renderMarkdown(text); $('output').classList.remove('hidden');
  } catch (error) { $('outputTitle').textContent = 'Could not create brief'; $('result').textContent = error.message; $('output').classList.remove('hidden'); }
  finally { button.disabled = false; button.innerHTML = '<span>✦</span> Create personalized talking points'; }
});
$('copyButton').onclick = async () => { await navigator.clipboard.writeText($('result').innerText); $('copyButton').textContent = 'Copied'; setTimeout(()=> $('copyButton').textContent='Copy',1200); };
