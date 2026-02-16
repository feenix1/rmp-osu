
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

function getSectionColumnTitleRow() {
    const result = document.querySelector(".course-sections > div:nth-child(1)");
    return result;
}

function getSectionListElements() {
    const sections=  document.querySelectorAll(".course-section")
    return sections;
}

function addProfDataToElement(name, element) {
    // console.log("RMP-OSU: Requesting RMP data for " + name);
    chrome.runtime.sendMessage({
        type: "fetchRating",
        name: name
    }, (response) => {
        // console.log("RMP data for " + name + ": ", response);
        element.textContent = "";
        const ratingEl = document.createElement("div");
        ratingEl.style.marginTop = "5px";
        ratingEl.style.fontSize = "14px";
        let text = "";
        if (response.profLink && response.quality && response.numRatings) {
            text = `<a href="https://www.ratemyprofessors.com${response.profLink}" target="_blank"><strong>${name}</strong></a>  ${response.quality}⭐ (${response.numRatings} ratings)`;
            if (response.numRatings == 1) {
                text = `<a href="https://www.ratemyprofessors.com${response.profLink}" target="_blank"><strong>${name}</strong></a>  ${response.quality}⭐ (${response.numRatings} rating)`;
            }
        }        
        else {
            console.log("RMP-OSU: No RMP data for " + name);
            text = `<strong> ${name}</strong> (No RMP Data)`;
        }
        if (response.numRatings == 0) {
            text = `<a href="https://www.ratemyprofessors.com${response.profLink}" target="_blank"><strong>${name}</strong></a> (No ratings)`;
        }        
        ratingEl.innerHTML = text;
        element.classList.add("rmp-osu-injected");
        element.appendChild(ratingEl);
    });
}

function addRMPToClassDescription() {
    const instructorEl = getProfessorElementsInClassDescription();
    if (!instructorEl || instructorEl.length === 0) return;
    for (let i = 0; i < instructorEl.length; i++) {
        if (instructorEl[i].classList.contains("rmp-osu-injected")) continue;
        const instructorName = instructorEl[i].textContent?.trim();
        // console.log("RMP-OSU: Found instructor name:", instructorEl[i].textContent);
        if (instructorName == null) continue;
        addProfDataToElement(instructorName, instructorEl[i]);
    }
}

function createSectionTitleElement(title) {
    //<div role="columnheader" scope="col">Actual Enrl</div>
    const element = document.createElement("div");
    element.role = "columnheader";
    element.scope = "col";
    element.textContent = title;
    return element;
}

function AddRMPToSections() {
    const sectionTitles = getSectionColumnTitleRow();
    sectionTitles.append(createSectionTitleElement("Instructor"))
    sectionTitles.append(createSectionTitleElement("Rating Count"))
    const sections = getSectionListElements();
}


setInterval(() => {
    addRMPToClassDescription();
}, 1000);

console.log("RMP-OSU: Content script loaded.");
