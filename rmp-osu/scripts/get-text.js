chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("RMP-OSU: Offscreen document received message: ", msg);
    if (msg.type !== "getText") return;
    const name = msg.name;
    const htmlString = msg.htmlString;
    const parser = new DOMParser();
    const element = parser.parseFromString(htmlString, "text/html");
    sendResponse(element.textContent);
})