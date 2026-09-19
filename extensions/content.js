(() => {
  if (document.getElementById('thrive-ai-launcher')) return;
  const launcher = document.createElement('button');
  launcher.id = 'thrive-ai-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open ThriveAI meeting companion');
  launcher.innerHTML = '<span>✦</span><strong>ThriveAI</strong><small>Prepare a meeting</small>';
  launcher.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_THRIVE_AI' }));
  document.body.appendChild(launcher);
})();
