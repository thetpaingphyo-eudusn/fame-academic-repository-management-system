const SEMESTER_VALUES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

/** Map academic semester (1st–10th) to year level (1–5). */
const semesterToYear = (semester) => {
    const idx = SEMESTER_VALUES.indexOf(semester);
    if (idx < 0) return null;
    return Math.floor(idx / 2) + 1;
};

module.exports = { SEMESTER_VALUES, semesterToYear };
