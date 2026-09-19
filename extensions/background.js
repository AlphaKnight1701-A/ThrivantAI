chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'OPEN_THRIVE_AI' && sender.tab?.windowId) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {});
  }
});
