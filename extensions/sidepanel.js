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
  const prompt = `You are ThriveAI, a thoughtful assistant that helps Thrivent financial advisors prepare for a meeting. Create a concise, human, relationship-first MEETING BRIEF. This is preparation support, not financial advice. Never invent account balances, suitability, performance, or personal facts. Use only stated information. Do not infer financial needs, risk tolerance, immigration status, beliefs, or preferences from country/region of origin, language, ethnicity, or family structure. Country/region may only guide respectful language, cultural curiosity, and an invitation for the client to tell the advisor what matters. Give 5 sections in this exact friendly format: ### Connection opener, ### Personalized talking points, ### Questions to listen for, ### Bilingual phrasing, ### Advisor guardrails. Under talking points and questions, use bullet lists.\n\nMember: ${memberName}\nMeeting: ${$('meetingType').value}\nMember preference: ${$('memberPreference').value}\nLanguage requested: ${$('language').value}\nLife stage: ${$('lifeStage').value}\nCountry/region of origin, if stated by member: ${$('origin').value || 'Not provided'}\nClient intelligence: ${$('context').value || 'No additional notes provided.'}\nAdvisor intelligence: ${$('advisorIntel').value || 'No advisor intelligence provided.'}\nConversation approach: ${templates[selectedTemplate]}\n\nFor bilingual phrasing, give 3 short pairs in English and natural neutral Spanish. Prioritize dignity, clarity, family inclusion, and a trusted in-person relationship. If the attached member notes conflict with the stated context, flag that gently rather than assume.`;
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
