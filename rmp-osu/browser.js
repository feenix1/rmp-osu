chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "fetchRequest") return;
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