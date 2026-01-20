chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "fetchRating") return;
    const name = msg.name;
    getProfData(name).then(data => {
        sendResponse(data);
    });
    return true;
});

async function getProfData(name) {
    let data = await getCachedProfData(name);
    if (outputValid(data)) {
        console.log("RMP-OSU: Returning cached data for " + name);
        return data;
    }
    console.log("RMP-OSU: No valid cached data for " + name + ", fetching from web.");
    const res = await fetchWebProfData(name);
    data = await parseWebResponse(name, res);
    cacheProfData(name, data);
    return data;
}

async function fetchWebProfData(name) {
    const query = encodeURIComponent(name);

    const header = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    };

    return await fetch(`https://www.ratemyprofessors.com/search/professors/742?q=${query}`, { headers: header });
}

async function parseWebResponse(name, res) {
    if (!res.ok) {
        console.log("RMP-OSU: Network response was not ok");
        return { error: "Network response was not ok" };
    }
    try {
        const text = await res.text();
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
        return data;
        
    } catch (error) {
        console.error("Error parsing RMP response:", error);
        return { error: "Error parsing RMP response" };
    }
}

function cacheProfData(name, data) {
    let cached = { ...data };
    cached.timestamp = Date.now();
    chrome.storage.local.set({ [name]: data });
    console.log("RMP-OSU: Cached data for " + name, cached);
}

async function getCachedProfData(name, maxAgeHours = 24) {
    console.log("RMP-OSU: Checking cache for " + name);
    const cached = await chrome.storage.local.get(name);
    if (!cached || !cached[name]) {
        console.log("RMP-OSU: No cached data for " + name);
        return { error: "No cached data" };
    }
    const data = cached[name];
    if (Date.now() - data.timestamp > maxAgeHours * 3600000) {
        chrome.storage.local.remove(name);
        console.log("RMP-OSU: Cached data expired for " + name);
        return { error: "Cached data expired" };
    }
    if (!outputValid(data)) {
        chrome.storage.local.remove(name);
        console.log("RMP-OSU: Invalid cached data for " + name);
        return { error: "Invalid cached data" };
    }
    console.log("RMP-OSU: Found cached data for " + name);
    return data;
}

function outputValid(data) {
    if (!data) return false;
    if (data.error) return false;
    if (data.quality == null) return false;
    return true;
}
