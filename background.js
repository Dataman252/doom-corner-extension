chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 740,
    height: 600
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-boss-key') {
    chrome.windows.getAll({ windowTypes: ['popup'] }, (windows) => {
      windows.forEach(win => {
        const newState = win.state === 'minimized' ? 'normal' : 'minimized';
        chrome.windows.update(win.id, { state: newState });
      });
    });
  }
});
