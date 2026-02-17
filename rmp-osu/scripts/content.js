profDataCache = {}

function getProfessorDescriptionElement() {
    return document.querySelector(".instructor-detail");
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

function getSectionTitleRow() {
    const result = document.querySelector(".course-sections > div:first-child");
    // For some reason after the title row gets marked with rmp-osu-inject so
    // it doesn't add the columns again, this selector just can't find it
    // Doesn't really matter bc it still prevents columns being added again ig
    return result;
}

function getSectionListElements() {
    const sections=  document.querySelectorAll(".course-section")
    return sections;
}

async function getProfDataFor(profName) {
    console.log("RMP-OSU: Requesting RMP data for " + profName);
    return await chrome.runtime.sendMessage({
        type: "fetchRating",
        name: profName,
    })
}

async function addRMPToClassDescription() {
    const instructorEl = getProfessorDescriptionElement();
    if (!instructorEl || instructorEl.length === 0) return;
    if (instructorEl.classList.contains("rmp-osu-injected")) return;
    const instructorName = instructorEl.textContent?.trim();
    console.log("RMP-OSU: Found instructor name:", instructorEl.textContent);
    if (instructorName == null) return;
    const response = await getProfDataFor(instructorName);
    console.log("RMP data for " + instructorName + ": ", response);
    instructorEl.textContent = "";
    const ratingEl = document.createElement("div");
    ratingEl.style.marginTop = "5px";
    ratingEl.style.fontSize = "14px";
    let text = "";
    if (response.profLink && response.quality && response.numRatings) {
        text = `<a href="https://www.ratemyprofessors.com${response.profLink}" target="_blank"><strong>${instructorName}</strong></a>  ${response.quality}⭐ (${response.numRatings} ratings)`;
        if (response.numRatings == 1) {
            text = `<a href="https://www.ratemyprofessors.com${response.profLink}" target="_blank"><strong>${instructorName}</strong></a>  ${response.quality}⭐ (${response.numRatings} rating)`;
        }
    }        
    else {
        console.log("RMP-OSU: No RMP data for " + instructorName);
        text = `<strong> ${instructorName}</strong> (No RMP Data)`;
    }
    if (response.numRatings == 0) {
        text = `<a href="https://www.ratemyprofessors.com${response.profLink}" target="_blank"><strong>${instructorName}</strong></a> (No ratings)`;
    }        
    ratingEl.innerHTML = text;
    instructorEl.classList.add("rmp-osu-injected");
    instructorEl.appendChild(ratingEl);
}

function createSectionTitleElement(title) {
    //<div role="columnheader" scope="col">Actual Enrl</div>
    const element = document.createElement("div");
    element.role = "columnheader";
    element.scope = "col";
    element.textContent = title;
    return element;
}

function createSectionColValue(title, value) {
    const element = document.createElement("div");
    element.class = `course-section-${title}`
    element.role = "gridcell";
    element.textContent = value;
    return element;
}

function getSectionCRN(sectionElement) {
    const crnElement = sectionElement.querySelector(".course-section-crn");
    let text = ""
    crnElement.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.nodeValue;
        }
    })
    return text.trim();
}

async function getInstructorForCRN(crn) {
    const name = await chrome.runtime.sendMessage({
        type: "getNameFromCRN",
        crn: crn,
    })
    return name;
}

async function addRMPToSections() {
    const sectionTitles = getSectionTitleRow();
    if (sectionTitles != null) {
        if (!sectionTitles.classList.contains("rmp-osu-injected")) {
            sectionTitles.append(createSectionTitleElement("Instructor"))
            sectionTitles.append(createSectionTitleElement("Rating Count"))
            sectionTitles.classList.add("rmp-osu-injected");
        }
    }
    const sections = getSectionListElements();
    console.log(`Found ${sections.length} section entries`)
    for (i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section.classList.contains("rmp-osu-injected")) continue;
        section.classList.add("rmp-osu-injected");
        const crn = getSectionCRN(section);
        const instructor = await getInstructorForCRN(crn);
        const instructorValue = createSectionColValue("instructor", instructor);
        section.append(instructorValue);
        const ratingValue = createSectionColValue("rating", "placeholder");
        section.append(ratingValue);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    while (true) {
        await addRMPToClassDescription();
        // await addRMPToSections();
        await sleep(1000);
    }
}

console.log("RMP-OSU: Content script loaded.");
main();

