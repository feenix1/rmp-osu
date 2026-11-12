chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("Background script received message:", msg);
    if (msg.type !== "fetchRequest") return;
    console.log("Received message as fetchRequest:", msg);
    const url = msg.url;
    const method = msg.method || "GET";
    const headers = msg.headers || {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    };
    const body = msg.body || null;
    fetch(url, { method, headers, body })
        .then(res => res.text())
        .then(text => sendResponse({ success: true, data: text }))
        .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "storeDataSync") return;
    console.log("Received message as storeDataSync:", msg);
    const key = msg.key;
    const value = msg.value;
    chrome.storage.sync.set({ [key]: value }, () => {
        sendResponse({ success: true });
    });
    return true;
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "readDataSync") return;
    console.log("Received message as readDataSync:", msg);
    const key = msg.key;
    chrome.storage.sync.get([key], (result) => {
        sendResponse({ success: true, data: result[key] });
    });
    return true;
})