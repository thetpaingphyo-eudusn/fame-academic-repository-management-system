const FAME = 'FAME';

const toDisplayText = (text) => {
    if (!text) return text;
    return String(text).replace(/gemini/gi, FAME).replace(/FAME DEV/gi, FAME);
};

module.exports = { FAME, toDisplayText };
