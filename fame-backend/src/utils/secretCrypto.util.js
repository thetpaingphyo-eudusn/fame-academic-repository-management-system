const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
    const secret = process.env.JWT_SECRET || process.env.SETTINGS_ENCRYPTION_KEY || 'fame-default-dev-key-change-me';
    return crypto.createHash('sha256').update(String(secret)).digest();
}

function encrypt(plainText) {
    if (!plainText) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(payload) {
    if (!payload) return '';
    try {
        const [ivB64, tagB64, dataB64] = String(payload).split(':');
        if (!ivB64 || !tagB64 || !dataB64) return '';
        const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
        decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(dataB64, 'base64')),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    } catch {
        return '';
    }
}

function maskSecret(value) {
    if (!value) return '';
    const s = String(value);
    if (s.length <= 8) return '••••••••';
    return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

module.exports = { encrypt, decrypt, maskSecret };
