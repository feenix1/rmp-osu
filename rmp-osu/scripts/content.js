profDataCache = {}

class ProfessorData {
    constructor(firstName, lastName, avgRating, numRatings, wouldTakeAgainPercent, avgDifficulty, legacyId) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.avgRating = avgRating.toPrecision(2);
        this.numRatings = numRatings;
        this.wouldTakeAgainPercent = wouldTakeAgainPercent;
        this.avgDifficulty = avgDifficulty.toPrecision(2);
        this.legacyId = legacyId;
    }

    getProfLink() {
        if (this.legacyId) {
            return `https://www.ratemyprofessors.com/professor/${this.legacyId}`;
        }
        else {
            return null;
        }
    }

    getFullName() {
        if (!this.firstName || !this.lastName) {
            return null;
        }
        return `${this.firstName} ${this.lastName}`;
    }
}

function getProfessorDescriptionElement() {
    return document.querySelector(".instructor-detail");
}

// // could be unperformant on large lists? use sparingly
// function getProfessorElementsInClassPreview() {
//     const results = document.querySelectorAll('[class^="result__link"]');
//     console.log("RMP-OSU: Found " + results.length + " class preview result elements.");
//     const instructorElements = Array.from(results).map(result => {
//         return result.querySelector('.result__flex--9.text--right');
//     });
//     console.log(instructorElements);
//     return instructorElements;
// }


async function getProfessorDataFor(professorName) {
    if (profDataCache[professorName]) {
        console.log("RMP-OSU: Returning cached data for " + professorName);
        return profDataCache[professorName];
    }
    console.log("RMP-OSU: Requesting RMP data for " + professorName);
    const gqlQuery = `
        query NewSearch($query: TeacherSearchQuery!) {
            newSearch {
                teachers(
                    query: $query,
                    first: 5
                ) {
                    edges {
                        node {
                            avgDifficulty
                            avgRating
                            firstName
                            lastName
                            numRatings
                            wouldTakeAgainPercent
                            legacyId
                        }
                    }
                }
            }
        }
    `;
    response = await chrome.runtime.sendMessage({
        type: "fetchRequest",
        method: "POST",
        url: "https://www.ratemyprofessors.com/graphql",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query: gqlQuery,
            variables: {
                query: {
                    text: professorName,
                    schoolID: "U2Nob29sLTc0Mg=="
                }
            }
        })
    })
    if (!response.success) {
        console.error("RMP-OSU: Failed to fetch RMP data for " + professorName + ": " + response.error);
        return null;
    }
    const gqlResponse = JSON.parse(response.data);
    if (gqlResponse.errors) {
        console.error("RMP-OSU: GraphQL error while fetching RMP data for " + professorName + ": " + gqlResponse.errors.map(e => e.message).join(", "));
        return null;
    }
    const teachers = gqlResponse.data.newSearch.teachers.edges;
    if (teachers.length === 0) {
        console.log("RMP-OSU: No RMP data found for " + professorName);
        return null;
    }
    // TODO: Make amount of results to match configureable
    for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i].node;
        const fullNameStripped = `${teacher.firstName}${teacher.lastName}`.toLowerCase().replace(/[.\s]+/g, '');
        const professorNameStripped = professorName.toLowerCase().replace(/[.\s]+/g, '');
        console.log(`RMP-OSU: Comparing ${fullNameStripped} to ${professorNameStripped}`);
        if (fullNameStripped === professorNameStripped) {
            console.log(`RMP-OSU: Found matching RMP data for ${professorName} with name ${teacher.firstName} ${teacher.lastName}`);
            const profData = new ProfessorData(
                teacher.firstName,
                teacher.lastName,
                teacher.avgRating,
                teacher.numRatings,
                teacher.wouldTakeAgainPercent,
                teacher.avgDifficulty,
                teacher.legacyId
            );
            profDataCache[professorName] = profData;
            return profData;
        }
    }
    console.log("RMP-OSU: No matching RMP data found for " + professorName);
    return null;
}

function createRatingElement(profData, fallbackName = null) {
    const ratingEl = document.createElement("div");
    ratingEl.style.marginTop = "5px";
    ratingEl.style.fontSize = "14px";
    let text = "";
    if (profData && profData.legacyId && profData.avgRating && profData.numRatings) {
        text = `<a href="${profData.getProfLink()}" target="_blank"><strong>${profData.getFullName()}</strong></a>  ${profData.avgRating}⭐ (${profData.numRatings} ratings)`;
        if (profData.numRatings == 1) {
            text = `<a href="${profData.getProfLink()}" target="_blank"><strong>${profData.getFullName()}</strong></a>  ${profData.avgRating}⭐ (${profData.numRatings} rating)`;
        }
        if (profData.numRatings == 0) {
            text = `<a href="${profData.getProfLink()}" target="_blank"><strong>${profData.getFullName()}</strong></a> (No ratings)`;
        }        
    }        
    else {
        console.log("RMP-OSU: No RMP data for " + fallbackName);
        text = `<strong> ${fallbackName}</strong> (No RMP Data)`;
    }
    ratingEl.innerHTML = text;
    return ratingEl;
}

async function addRMPToClassDescription() {
    const instructorEl = getProfessorDescriptionElement();
    if (!instructorEl || instructorEl.length === 0) return;
    if (instructorEl.classList.contains("rmp-osu-injected")) return;
    const instructorName = instructorEl.textContent?.trim();
    if (instructorName == null) return;
    console.log("RMP-OSU: Found instructor name:", instructorEl.textContent);
    const profData = await getProfessorDataFor(instructorName);
    instructorEl.textContent = "";
    instructorEl.classList.add("rmp-osu-injected");
    const ratingEl = createRatingElement(profData, instructorName);
    instructorEl.appendChild(ratingEl);
}

async function getInstructorForCRN(crn) {
    const response = await chrome.runtime.sendMessage({
        type: "fetchRequest",
        method: "POST",
        url: "https://classes.oregonstate.edu/api/?page=fose&route=details",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Content-Type": "application/json",
            "Host": "classes.oregonstate.edu",
        },
        body: `{"key": "crn:${crn}"}`
    });
    const parsed = JSON.parse(response);
    const tempDiv = document.createElement("div");
    tempDiv.style.display = "none";
    tempDiv.innerHTML = parsed.instructordetail_html;
    const instructorName = tempDiv.textContent.trim();
    return instructorName;
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

async function getSectionDataFor(className) {
    const response = await chrome.runtime.sendMessage({
        type: "fetchRequest",
        method: "POST",
        url: "https://classes.oregonstate.edu/api/?page=fose&route=details",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Content-Type": "application/json",
            "Host": "classes.oregonstate.edu",
        },
        body: `{"group": "code:${className}"}`
    });
    const parsed = JSON.parse(response);
    return parsed.allInGroup;
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
        const profData = await getProfessorDataFor(instructor);
        if (profData) {
            console.log(`Got RMP data for section ${crn}:`, profData);
            const instructorValue = createSectionColValue("instructor", `<a href="${profData.getProfLink()}">${profData.getFullName()}</a> ${profData.avgRating}⭐`);
            const ratingValue = createSectionColValue("rating", `${profData.numRatings} ratings`);
            section.append(instructorValue);
            section.append(ratingValue);
        }
        else {
            console.log(`No RMP data for section ${crn} with instructor ${instructor}`);
            const instructorValue = createSectionColValue("instructor", instructor);
            const ratingValue = createSectionColValue("rating", `N/A`);
            section.append(instructorValue);
            section.append(ratingValue);
        }
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

