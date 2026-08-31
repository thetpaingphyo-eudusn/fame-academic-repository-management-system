/**
 * JWT Token Utilities
 */

const jwt = require('jsonwebtoken');

class TokenUtil {
    // Generate access token
    static generateAccessToken(userId, role) {
        return jwt.sign(
            { id: userId, role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );
    }

    // Generate refresh token (optional, for future use)
    static generateRefreshToken(userId) {
        return jwt.sign(
            { id: userId, type: 'refresh' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
    }

    // Verify token
    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    // Decode token without verification
    static decodeToken(token) {
        return jwt.decode(token);
    }

    // Check if token is expired
    static isTokenExpired(token) {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) return true;
        return Date.now() >= decoded.exp * 1000;
    }

    // Get remaining time of token (in seconds)
    static getTokenRemainingTime(token) {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) return 0;
        const remaining = decoded.exp * 1000 - Date.now();
        return Math.max(0, Math.floor(remaining / 1000));
    }
}

module.exports = TokenUtil;