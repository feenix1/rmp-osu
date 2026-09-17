// ===================================================
// Name Matching
// ===================================================

// Tables and suffixes from https://github.com/craj/name-match/blob/main/src/name-normalizer.js
const PREFIXES = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'rev', 'hon'];
const SUFFIXES = ['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'md', 'phd', 'esq'];
const NAME_TO_ALIAS = {
  'william': ['will', 'bill', 'billy', 'willy', 'willie'],
  'robert': ['rob', 'bob', 'bobby', 'robbie'],
  'richard': ['rick', 'dick', 'richie', 'ricky'],
  'michael': ['mike', 'mikey', 'mick'],
  'james': ['jim', 'jimmy', 'jamie'],
  'joseph': ['joe', 'joey', 'jo'],
  'thomas': ['tom', 'tommy'],
  'christopher': ['chris', 'topher'],
  'charles': ['chuck', 'charlie', 'chas'],
  'daniel': ['dan', 'danny'],
  'matthew': ['matt', 'matty'],
  'anthony': ['tony', 'ant'],
  'steven': ['steve', 'stevie'],
  'kenneth': ['ken', 'kenny'],
  'edward': ['ed', 'eddie', 'ted', 'teddy'],
  'donald': ['don', 'donny'],
  'elizabeth': ['liz', 'lizzy', 'beth', 'betty', 'eli'],
  'jennifer': ['jen', 'jenny'],
  'katherine': ['kathy', 'kate', 'katie', 'katy'],
  'margaret': ['maggie', 'meg', 'megan', 'peggy'],
  'patricia': ['pat', 'patty', 'trish'],
  'deborah': ['deb', 'debbie'],
  'jessica': ['jess', 'jessie'],
  'sandra': ['sandy'],
  'barbara': ['barb', 'barbie'],
  'stephanie': ['steph', 'stephy'],
  'victoria': ['vicky', 'tori'],
  'jonathan': ['jon', 'jonny'],
  'nicholas': ['nick', 'nicky'],
  'jeffrey': ['jeff'],
  'benjamin': ['ben', 'benny'],
  'timothy': ['tim', 'timmy'],
  'gregory': ['greg', 'gregg'],
  'raymond': ['ray'],
  'samuel': ['sam', 'sammy'],
  'andrew': ['andy', 'drew'],
  'alexander': ['alex', 'al'],
  'david': ['dave', 'davey'],
  'joshua': ['josh']
};

// reverse lookup
const ALIAS_TO_NAME = {};
for (const [name, aliases] of Object.entries(NAME_TO_ALIAS)) {
    for (const alias of aliases) {
        if (!ALIAS_TO_NAME[alias]) {
            ALIAS_TO_NAME[alias] = [];
        }
        ALIAS_TO_NAME[alias].push(name);
    }
}


function jaroWinklerSimilarity(s1, s2) {
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;
    let len1 = s1.length;
    let len2 = s2.length;

}

class Name {
    // TODO: make constructor gracefully fail if it can't parse name pieces
    constructor(nameString) {
        // names are all lowercase, trimmed, with basic variation in name table 
        // and get rid of punctuation and make accents closest ascii.
        // tbh scheduler and rmp might not support non-ascii names but just in case

        // init everything null
        this.prefix = null;
        this.firstName = null;
        this.lastName1 = null;
        this.lastName2 = null;
        this.suffix = null;
        if (!nameString) {
            console.warn("RMP-OSU: Name constructor called with null or empty string.");
            return;
        }

        // lower and trim
        nameString = nameString.toLowerCase();
        nameString = nameString.trim();
        // remove accents and punctuation
        nameString = Name.removeAccents(nameString);

        // extract prefix, remove it
        this.prefix = Name.extractPrefix(nameString);
        if (this.prefix) {
            nameString = nameString.replace(this.prefix, "").trim();
        }
        if (nameString.trim() === "") {
            console.warn("RMP-OSU: Name constructor called with name string that only contains a prefix.");
            return
        }

        // in the case of non defined prefix its kinda over
        this.firstName = Name.getBasicFirstName(nameString.split(' ')[0]);
        nameString = nameString.replace(this.firstName, "").trim();
        if (nameString === "") {
            console.warn("RMP-OSU: Name constructor called with name string that contains nothing past first name.");
            return
        }

        if (!nameString.includes('-')) {
            // non-hyphenated
            const lastNames = nameString.split(' ');
            this.lastName1 = lastNames[0].trim();
            if (lastNames.length > 1) {
                this.lastName2 = lastNames[1].trim();
            }
        }
        else {
            // hyphenated
            const lastNames = nameString.split('-');
            this.lastName1 = lastNames[0].trim();
            if (lastNames.length > 1) {
                this.lastName2 = lastNames[1].trim();
            }
            else {
                console.warn("RMP-OSU: Name constructor called with name string that contains a hyphen but no second last name.");
            }
        }

        this.suffix = Name.extractSuffix(nameString);
    }

    /**
     * Check if the name is valid, should always check after construction.
     * @returns True if firstName and lastName1 are not null.
     */
    valid() {
        return this.firstName != null && this.lastName1 != null;
    }

    // Mostly going to try equating these kinds of cases:
    // - "Dr. John Smith" vs "John Smith"
    // - "John Smith" vs "John A. Smith"
    // - "John Smith" vs "John Smith Jr."
    // - "John Smith" vs "John Smith-Henry"
    // - "John Henry" vs "John Smith-Henry"
    // - "John Henry-Smith" vs "John Smith-Henry"
    // - "Alexander Smith" vs "Alex Smith"
    // - "André Smith" vs "Andre Smith"
    // and typos
    similarTo(otherName) {
        if (!otherName) return false;
        if (this.firstName !== otherName.firstName) return false;
        // TODO: finish with jw similarity threshold + 

    }
    static removeAccents(nameString) {
        if (!nameString) return null;
        nameString = nameString.replace(/á|à|â|ã|ä/g, 'a');
        nameString = nameString.replace(/é|è|ê|ë/g, 'e');
        nameString = nameString.replace(/í|ì|î|ï/g, 'i');
        nameString = nameString.replace(/ó|ò|ô|õ|ö/g, 'o');
        nameString = nameString.replace(/ú|ù|û|ü/g, 'u');
        nameString = nameString.replace(/ç/g, 'c');
        nameString = nameString.replace(/ñ/g, 'n');
        nameString = nameString.replace(/[^a-z\s]/g, '');
        return nameString;
    }
    static extractPrefix(nameString) {
        if (!nameString) return null;
        const prefix = nameString.split(' ')[0];
        if (PREFIXES.includes(prefix.toLowerCase())) {
            return prefix;
        }
        return null;
    }
    static extractSuffix(nameString) {
        if (!nameString) return null;
        const parts = nameString.split(' ');
        if (parts.length === 0) return null;
        const suffix = parts[parts.length - 1];
        if (SUFFIXES.includes(suffix.toLowerCase())) {
            return suffix;
        }
        return null;
    }
    static getBasicFirstName(firstName) {
        if (!firstName) return null;
        if (ALIAS_TO_NAME.hasOwnProperty(firstName.toLowerCase())) {
            return ALIAS_TO_NAME[firstName.toLowerCase()][0];
        }
        return firstName;
    }
    getFullName() {
        const parts = [];
        if (this.prefix) parts.push(this.prefix);
        if (this.firstName) parts.push(this.firstName);
        if (this.middleName) parts.push(this.middleName);
        if (this.lastName1) parts.push(this.lastName1);
        if (this.lastName2) parts.push(this.lastName2);
        if (this.suffix) parts.push(this.suffix);
        return parts.join(' ');
    }
}


// ===================================================
// Content Script
// ===================================================

profDataCache = {}
crnToInstructorCache = {}
classNameToSectionDataCache = {}

class ProfessorData {
    constructor(name, avgRating, numRatings, wouldTakeAgainPercent, avgDifficulty, legacyId) {
        this.name = name;
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
        if (!this.name) {
            return null;
        }
        return this.name;
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
        console.error("RMP-OSU: Failed to get a response for " + professorName + ": " + response.error);
        return null;
    }
    const gqlResponse = JSON.parse(response.data);
    if (gqlResponse.errors) {
        console.error("RMP-OSU: GraphQL error(s) found in JSON response while fetching RMP data for " + professorName + ": " + gqlResponse.errors.map(e => e.message).join(", "));
        return null;
    }
    const teachers = gqlResponse.data.newSearch.teachers.edges;
    if (teachers.length === 0) {
        console.log("RMP-OSU: No teachers found in GraphQL query for " + professorName);
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
    const instructorName = instructorEl.textContent.trim();
    if (instructorName == "") return;
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
    const crnData = sectionElement.getAttribute("data-key").split(":")[1];
    if (crnData) {
        console.log("RMP-OSU: Found CRN in data-key attribute:", crnData);
        return crnData;
    }
    console.warn("RMP-OSU: CRN not found in data-key, falling back to query selector", sectionElement);
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

