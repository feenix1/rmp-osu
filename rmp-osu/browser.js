import DomParser from "dom-parser";
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "fetchRating") return;

  const name = msg.name;
  const query = encodeURIComponent(name);

  const header = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
  };

  fetch(`https://www.ratemyprofessors.com/search/professors/742?q=${query}`, { headers: header })
    .then(res => {
        if (!res.ok) {
            console.log("RMP-OSU: Network response was not ok");
            sendResponse({ error: "Network response was not ok" });
            return;
        }
        res.text().then(text => {
            const parser = new DomParser();
            const doc = parser.parseFromString(text, "text/html");

            const nodes = doc.querySelectorAll(
                '[class^="TeacherCard__StyledTeacherCard"]'
            );

            let quality;
            let difficulty;
            let numRatings;
            let takeAgain;
            let profLink;

            nodes.forEach(node => {
                const profNameEl = node.querySelector(
                    '[class^="CardName__StyledCardName"]'
                );
                const profName = profNameEl ? profNameEl.textContent.trim() : "";
                if (profName.toLowerCase() === name.toLowerCase()) {
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
                    return;
                }
            });
            
            sendResponse({
                name: msg.name,
                quality,
                difficulty,
                numRatings,
                takeAgain,
                profLink
            });

        }).catch(err => {
            console.error("Error parsing RMP response:", err);
            sendResponse({ error: "Error parsing RMP response" });
        });
    })
  return true;
});