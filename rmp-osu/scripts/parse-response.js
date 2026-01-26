chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("RMP-OSU: Offscreen document received message: ", msg);
    if (msg.type !== "parseRMPResponse") return;
    const name = msg.name;
    const text = msg.text;
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");

        const nodes = doc.querySelectorAll(
            '[class^="TeacherCard__StyledTeacherCard"]'
        );

        let quality;
        let difficulty;
        let numRatings;
        let takeAgain;
        let profLink;

        for (const node of nodes) {
            const profNameEl = node.querySelector(
                '[class^="CardName__StyledCardName"]'
            );
            const profName = profNameEl ? profNameEl.textContent.trim() : "";

            if (profName.toLowerCase() !== name.toLowerCase()) continue;

            const qualityEl = node.querySelector(
                '[class^="CardNumRating__CardNumRatingNumber"]'
            );
            quality = qualityEl ? qualityEl.textContent.trim() : null;
            const difficultyEl = node.querySelector(
                '[class^="CardFeedback__CardFeedbackNumber"]'
            );
            difficulty = difficultyEl ? difficultyEl.textContent.trim() : null;
            const numRatingsEl = node.querySelector(
                '[class^="CardNumRating__CardNumRatingCount"]'
            );
            numRatings = numRatingsEl ? numRatingsEl.textContent.trim().split(" ")[0] : null;
            const takeAgainEl = node.querySelector(
                '[class^="CardFeedback__CardFeedbackNumber"]'
            );
            takeAgain = takeAgainEl ? takeAgainEl.textContent.trim() : null;
            profLink = node.getAttribute("href");
            break;
        }

        const data = {
            name,
            quality,
            difficulty,
            numRatings,
            takeAgain,
            profLink
        }

        console.log("RMP-OSU: Parsed RMP data for " + name + ": ", data);
        sendResponse(data);
        
    } catch (error) {
        console.error("Error parsing RMP response:", error);
        sendResponse({ error: "Error parsing RMP response" });
    }
})