function getProfessorElementsInClassDescription() {
    return document.getElementsByClassName("instructor-detail");
}

// could be unperformant on large lists? use sparingly
function getProfessorElementsInClassPreview() {
    const results = document.querySelectorAll('[class^="result__link"]');
    console.log("RMP-OSU: Found " + results.length + " class preview result elements.");
    const instructorElements = Array.from(results).map(result => {
        return result.querySelector('.result__flex--9.text--right');
    });
    console.log(instructorElements);
    return instructorElements;
}

function addProfData(name, element) {
    console.log("RMP-OSU: Requesting RMP data for " + name);
    chrome.runtime.sendMessage({
        type: "fetchRating",
        name: name
    }, (response) => {
        console.log("RMP-OSU: Handle RMP data for " + name);
        if (!response || response.quality === null) {
            return;
        }
        console.log("RMP data for " + name + ": ", response);
        return;

        const ratingEl = document.createElement("div");
        ratingEl.style.marginTop = "5px";
        ratingEl.style.fontSize = "14px";
        ratingEl.innerHTML = `
            Quality: ${response.quality} / 5<br>
            Difficulty: ${response.difficulty} / 5<br>
            Number of Ratings: ${response.numRatings}<br>
            Would Take Again: ${response.takeAgain}%<br>
            <a href="https://www.ratemyprofessors.com${response.profLink}" target="_blank">View on RateMyProfessors.com</a>
        `;
        instructorEl[0].appendChild(ratingEl);
    });
}

setInterval(() => {
    const instructorEl = getProfessorElementsInClassDescription();
    if (!instructorEl || instructorEl.length === 0) return;
    for (let i = 0; i < instructorEl.length; i++) {
        const instructorName = instructorEl[i].textContent?.trim();
        console.log("RMP-OSU: Found instructor name:", instructorEl[i].textContent);
        if (instructorName == null) continue;
        addProfData(instructorName, instructorEl[i]);
    }
}, 1000);

console.log("RMP-OSU: Content script loaded.");
