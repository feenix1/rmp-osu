profDataCache = {}
crnToInstructorCache = {}
classNameToSectionDataCache = {}

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
    if (professorName == null || professorName.trim() === "") {
        console.log("RMP-OSU: No professor name provided");
        return null;
    }
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
    const response = await chrome.runtime.sendMessage({
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
            const profData = new ProfessorData(
                teacher.firstName,
                teacher.lastName,
                teacher.avgRating,
                teacher.numRatings,
                teacher.wouldTakeAgainPercent,
                teacher.avgDifficulty,
                teacher.legacyId
            );
            console.log(`RMP-OSU: Found matching RMP data for ${professorName} with name ${teacher.firstName} ${teacher.lastName}`, profData);
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
    if (profData != null && profData.legacyId != null && profData.avgRating != null && profData.numRatings != null) {
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
    if (crnToInstructorCache[crn]) {
        console.log(`RMP-OSU: Returning cached instructor ${crnToInstructorCache[crn]} for CRN ${crn}`);
        return crnToInstructorCache[crn];
    }
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
    if (!response.success) {
        console.error(`RMP-OSU: Failed to fetch instructor for CRN ${crn}: ${response.error}`);
        return null;
    }
    const parsed = JSON.parse(response.data);
    const tempDiv = document.createElement("div");
    tempDiv.style.display = "none";
    tempDiv.innerHTML = parsed.instructordetail_html;
    const instructorName = tempDiv.textContent.trim();
    crnToInstructorCache[crn] = instructorName;
    return instructorName;
}

function getSectionTitleRow() {
    const result = document.querySelector(".course-sections > div:first-child");
    // For some reason after the title row gets marked with rmp-osu-inject so
    // it doesn't add the columns again, this selector just can't find it
    // Doesn't really matter bc it still prevents columns being added again ig
    return result;
}

async function getSectionDataFor(className) {
    if (classNameToSectionDataCache[className]) {
        console.log(`RMP-OSU: Returning cached section data for ${className}`);
        return classNameToSectionDataCache[className];
    }
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
    const parsed = JSON.parse(response.body);
    classNameToSectionDataCache[className] = parsed;
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

function createSectionColValueElement(title) {
    const element = document.createElement("div");
    element.class = `course-section-${title}`
    element.role = "gridcell";
    return element;
}

function getSectionCRN(sectionElement) {
    const crnElement = sectionElement.querySelector(".course-section-crn");
    if (!crnElement) {
        console.warn("RMP-OSU: Failed to find CRN element in section", sectionElement);
        return null;
    }
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
    const sections=  document.querySelectorAll(".course-section")
    console.log(`RMP-OSU: Found ${sections.length} section entries`)
    for (i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section.classList.contains("rmp-osu-injected")) continue;
        section.classList.add("rmp-osu-injected");
        const crn = getSectionCRN(section);
        const instructor = await getInstructorForCRN(crn);
        if (instructor != null && instructor.trim() !== "") {
            const profData = await getProfessorDataFor(instructor);
            if (profData != null) {
                console.log(`RMP-OSU: Got RMP data for section ${crn}:`, profData);
                const instructorValue = createSectionColValueElement("instructor");
                const link = document.createElement("a");
                link.href = profData.getProfLink();
                link.target = "_blank";
                if (profData.numRatings == 0) {
                    link.textContent = `${profData.getFullName()} (No ratings)`;
                }
                else {
                    link.textContent = `${profData.getFullName()} ${profData.avgRating}⭐`;
                }
                instructorValue.appendChild(link);
                const ratingValue = createSectionColValueElement("rating");
                ratingValue.textContent = `${profData.numRatings}`;
                section.append(instructorValue);
                section.append(ratingValue);
                continue
            }
        }
        console.log(`RMP-OSU: No RMP data for section ${crn} with instructor ${instructor}`);
        const instructorValue = createSectionColValueElement("instructor");
        const link = document.createElement("p");
        if (instructor == null || instructor.trim() === "") {
            link.textContent = `(N/A)`;
        }
        else {
            link.textContent = `${instructor} (Not in RMP)`;
        }
        instructorValue.appendChild(link);
        const ratingValue = createSectionColValueElement("rating");
        ratingValue.textContent = `N/A`;
        section.append(instructorValue);
        section.append(ratingValue);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    let backoffMs = 1000;
    const maxBackoffMs = 10000;
    while (true) {
        try {
            await addRMPToClassDescription();
            await addRMPToSections();
            backoffMs = 1000;
            await sleep(1000);
        }
        catch (error) {
            console.error("RMP-OSU: main loop error, backing off. Please report this on github.", error);
            await sleep(backoffMs);
            backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
        }
    }
}

console.log("RMP-OSU: Content script loaded.");
main();

