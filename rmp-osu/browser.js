chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "fetchRating") return;
    console.log("RMP-OSU: Service worker received fetchRating message for " + msg.name);
    const name = msg.name;
    getProfData(name).then(data => {
        sendResponse(data);
    });
    return true;
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "getNameFromCRN") return;
    console.log("RMP-OSU: Service worker received getNameFromCRN message for " + msg.crn);
    getInstructorForCRN(msg.crn).then((name) => {
        sendResponse(name);
        console.log(`RMP-OSU: Returning ${name} for message.`)
    })
    return true;
})

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

async function getProfData(name) {
    const res = await fetchWebProfData(name);
    data = await parseWebResponse(name, res);
    console.log("RMP-OSU: Returning fetched data for " + name);
    return data;
}

async function getSectionDataFor(className) {
    const response = await fetch(
        "https://classes.oregonstate.edu/api/?page=fose&route=details",
        {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
                "Content-Type": "application/json",
                "Host": "classes.oregonstate.edu",
            },
            body: `{"group": "code:${className}"`
        }
    )
    const parsed = await response.json()
    return parsed.allInGroup;
}

async function getInstructorForCRN(crn) {
    console.log(`Recieved request to find instructor for crn: ${crn}`)
    const response = await fetch(
        "https://classes.oregonstate.edu/api/?page=fose&route=details",
        {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
                "Content-Type": "application/json",
                "Host": "classes.oregonstate.edu",
            },
            body: `{"key": "crn:${crn}"}`
        }
    );
    const parsed = await response.json();
    const instructorHtml = parsed.instructordetail_html;
    console.log(`Recieved raw html: ${instructorHtml}, parsing`);
    const instructorName = await getIntructorNameFromHTMLString(instructorHtml);
    console.log(`Parsed into: ${instructorName}`);
    return instructorName;
}

async function fetchWebProfData(name) {
    const query = encodeURIComponent(name);
    const header = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    };
    return await fetch(`https://www.ratemyprofessors.com/search/professors/742?q=${query}`, { headers: header });
}

//#region Chrome Parse Web

// On Chrome, use offscreen document due to lack of DOMParser in service workers
async function parseWebResponse(name, res) {
    if (!res.ok) {
        console.log("RMP-OSU: Network response was not ok");
        return { error: "Network response was not ok" };
    }
    try {
        const text = await res.text();
        console.log("RMP-OSU: Got response text for " + name);
        await setupOffscreenDocument('parse-response.html');
        console.log("RMP-OSU: Offscreen document ready for " + name);
        const profData = await chrome.runtime.sendMessage({
            type: "parseRMPResponse",
            name: name,
            text: text
        })
        console.log("RMP-OSU: Received parsed data for " + name + ": ", profData);
        return profData;
    }
    catch (e) {
        console.error("RMP-OSU: Error parsing response text for " + name + ": " + e);
        return { error: "Error parsing response text" };
    }
}

async function getIntructorNameFromHTMLString(htmlString) {
    await setupOffscreenDocument('get-text.html');
    const instructorName = await chrome.runtime.sendMessage({
        type: "getText",
        htmlString: htmlString
    })
    return instructorName;
}

// Credit: https://developer.chrome.com/docs/extensions/reference/api/offscreen
let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['DOM_PARSER'],
      justification: 'Parse RMP web response into data',
    });
    await creating;
    creating = null;
  }
}

//#endregion

//#region Firefox Parse Web

// Firefox has DOMParser in service workers
// async function parseWebResponse(name, res) {
//     if (!res.ok) {
//         console.log("RMP-OSU: Network response was not ok");
//         return { error: "Network response was not ok" };
//     }
//     try {
//         const text = await res.text();
//         const parser = new DOMParser();
//         const doc = parser.parseFromString(text, "text/html");

//         const nodes = doc.querySelectorAll(
//             '[class^="TeacherCard__StyledTeacherCard"]'
//         );

//         let quality;
//         let difficulty;
//         let numRatings;
//         let takeAgain;
//         let profLink;

//         for (const node of nodes) {
//             const profNameEl = node.querySelector(
//                 '[class^="CardName__StyledCardName"]'
//             );
//             const profName = profNameEl ? profNameEl.textContent.trim() : "";

//             if (profName.toLowerCase() !== name.toLowerCase()) continue;

//             const qualityEl = node.querySelector(
//                 '[class^="CardNumRating__CardNumRatingNumber"]'
//             );
//             quality = qualityEl ? qualityEl.textContent.trim() : null;
//             const difficultyEl = node.querySelector(
//                 '[class^="CardFeedback__CardFeedbackNumber"]'
//             );
//             difficulty = difficultyEl ? difficultyEl.textContent.trim() : null;
//             const numRatingsEl = node.querySelector(
//                 '[class^="CardNumRating__CardNumRatingCount"]'
//             );
//             numRatings = numRatingsEl ? numRatingsEl.textContent.trim().split(" ")[0] : null;
//             const takeAgainEl = node.querySelector(
//                 '[class^="CardFeedback__CardFeedbackNumber"]'
//             );
//             takeAgain = takeAgainEl ? takeAgainEl.textContent.trim() : null;
//             profLink = node.getAttribute("href");
//             break;
//         }

//         const data = {
//             name,
//             quality,
//             difficulty,
//             numRatings,
//             takeAgain,
//             profLink
//         }

//         console.log("RMP-OSU: Parsed RMP data for " + name + ": ", data);
//         return data;
        
//     } catch (error) {
//         console.error("Error parsing RMP response:", error);
//         return { error: "Error parsing RMP response" };
//     }
// }

//#endregion