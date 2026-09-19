# ThriveAI

A Chrome/Edge extension prototype for Thrivent advisors. It creates relationship-first, bilingual meeting briefs using Gemini and optionally includes uploaded member documents as source material.

## Run it locally

1. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
2. Choose **Load unpacked** and select this exact extension folder: `C:\Users\david\Downloads\Local Repos\ThrivantAI\extensions`.
   That folder directly contains `manifest.json`, `sidepanel.html`, and the extension scripts. Do **not** select the parent `ThrivantAI` folder.
3. Optional local secret setup: copy `.env.example` to `.env`, then put your key after `GEMINI_API_KEY=`. This is a local developer record only; a browser extension cannot securely read `.env` at runtime.
4. Visit a Thrivent site, click the ThriveAI floating button or the extension icon. In the side panel, click the **gear icon (top right)**, paste the same Gemini key into **Gemini API key**, and click **Save key**.

The runtime key stays in the browser's extension storage. Uploaded documents are sent directly to Gemini only when the advisor chooses **Create personalized talking points**. For a production launch, route Gemini calls through a secured company backend; never package a shared production key into an extension.

## Product answer

ThriveAI modernizes the advisor experience without replacing the relationship model: it turns approved advisor context and optional member notes into a respectful conversation brief, bilingual phrases, and questions that keep the advisor focused on listening. Legacy members receive continuity and trust-forward language; Spanish-speaking and bilingual households receive clear, culturally responsive phrasing that can include family decision makers.
