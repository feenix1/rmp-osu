chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("RMP-OSU: Offscreen document received message: ", msg);
    if (msg.type !== "getText") return;
    const name = msg.name;
    const htmlString = msg.htmlString;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    console.log(`${doc}`)
    const text = doc.querySelector(".instructor-detail")?.textContent;
    if (text == null) {
        sendResponse("Staff")
    }
    else {
        sendResponse(text);
    }
})