/**
 * Dependency Check Service
 * Detects deprecated libraries, old versions, and security vulnerabilities
 */

class DependencyCheckService {
    constructor() {
        // Known deprecated libraries database
        this.deprecatedLibraries = {
            // JavaScript/Node.js
            'lodash': {
                deprecatedVersions: ['<4.0.0'],
                latestVersion: '4.17.21',
                suggestion: 'Update to lodash@4.17.21',
                severity: 'medium',
                reason: 'Older versions have prototype pollution vulnerabilities'
            },
            'moment': {
                deprecatedVersions: ['<2.29.4'],
                latestVersion: '2.29.4',
                suggestion: 'Consider using date-fns or Luxon instead',
                severity: 'high',
                reason: 'Moment.js is now legacy project. Use modern alternatives'
            },
            'request': {
                deprecatedVersions: ['*'],
                latestVersion: null,
                suggestion: 'Use axios or node-fetch instead',
                severity: 'high',
                reason: 'Request library is fully deprecated'
            },
            'express': {
                deprecatedVersions: ['<4.18.0'],
                latestVersion: '4.21.0',
                suggestion: 'Update express to latest version',
                severity: 'medium',
                reason: 'Security patches and bug fixes'
            },
            
            // Python
            'pytz': {
                deprecatedVersions: ['<2024.1'],
                latestVersion: '2024.1',
                suggestion: 'Update pytz or use zoneinfo (Python 3.9+)',
                severity: 'low',
                reason: 'Newer timezone data available'
            },
            'PIL': {
                deprecatedVersions: ['*'],
                latestVersion: null,
                suggestion: 'Use Pillow instead of PIL',
                severity: 'high',
                reason: 'PIL is deprecated, Pillow is the modern fork'
            },
            
            // Java
            'log4j': {
                deprecatedVersions: ['<2.17.0'],
                latestVersion: '2.23.1',
                suggestion: 'Update log4j to 2.17.0 or higher',
                severity: 'critical',
                reason: 'Critical security vulnerability (Log4Shell)'
            }
        };
    }

    // Parse package.json content
    parsePackageJson(content) {
        try {
            const packageJson = JSON.parse(content);
            return {
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {}
            };
        } catch (error) {
            return null;
        }
    }

    // Parse requirements.txt (Python)
    parseRequirementsTxt(content) {
        const lines = content.split('\n');
        const dependencies = {};
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const match = trimmed.match(/^([a-zA-Z0-9_-]+)([=<>!~]+)([0-9.]+)?/);
                if (match) {
                    dependencies[match[1]] = match[3] || 'latest';
                }
            }
        }
        return dependencies;
    }

    // Parse pom.xml (Maven - Java)
    parsePomXml(content) {
        const dependencies = {};
        const depRegex = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<version>(.*?)<\/version>[\s\S]*?<\/dependency>/gi;
        
        let match;
        while ((match = depRegex.exec(content)) !== null) {
            const artifactId = match[2];
            const version = match[3];
            dependencies[artifactId] = version;
        }
        
        return dependencies;
    }

    // Check if version is deprecated
    checkDeprecated(packageName, currentVersion) {
        const lib = this.deprecatedLibraries[packageName.toLowerCase()];
        if (!lib) {
            return {
                isDeprecated: false,
                isVulnerable: false,
                latestVersion: null,
                suggestion: null,
                severity: null
            };
        }

        let isDeprecated = false;
        let isVulnerable = false;

        // Check version against deprecated patterns
        for (const pattern of lib.deprecatedVersions) {
            if (pattern === '*') {
                isDeprecated = true;
                break;
            }
            if (this.isVersionMatch(currentVersion, pattern)) {
                isDeprecated = true;
                break;
            }
        }

        // Check for vulnerabilities
        if (lib.severity === 'high' || lib.severity === 'critical') {
            isVulnerable = true;
        }

        return {
            isDeprecated,
            isVulnerable,
            latestVersion: lib.latestVersion,
            suggestion: lib.suggestion,
            severity: lib.severity,
            reason: lib.reason
        };
    }

    // Compare version numbers
    isVersionMatch(current, pattern) {
        // Simple version comparison (can be extended)
        if (pattern.startsWith('<')) {
            const versionNum = parseFloat(pattern.substring(1));
            const currentNum = parseFloat(current);
            return currentNum < versionNum;
        }
        if (pattern.startsWith('>')) {
            const versionNum = parseFloat(pattern.substring(1));
            const currentNum = parseFloat(current);
            return currentNum > versionNum;
        }
        return false;
    }

    // Scan dependencies from package.json
    async scanNodeProject(content) {
        const packageData = this.parsePackageJson(content);
        if (!packageData) return null;

        const allDeps = { ...packageData.dependencies, ...packageData.devDependencies };
        const results = [];

        for (const [name, version] of Object.entries(allDeps)) {
            const cleanVersion = version.replace(/[\^~]/, '');
            const check = this.checkDeprecated(name, cleanVersion);
            
            results.push({
                name,
                currentVersion: cleanVersion,
                isDeprecated: check.isDeprecated,
                isVulnerable: check.isVulnerable,
                latestVersion: check.latestVersion,
                suggestion: check.suggestion,
                severity: check.severity,
                reason: check.reason
            });
        }

        return results;
    }

    // Scan from requirements.txt
    async scanPythonProject(content) {
        const dependencies = this.parseRequirementsTxt(content);
        const results = [];

        for (const [name, version] of Object.entries(dependencies)) {
            const check = this.checkDeprecated(name, version);
            
            results.push({
                name,
                currentVersion: version,
                isDeprecated: check.isDeprecated,
                isVulnerable: check.isVulnerable,
                latestVersion: check.latestVersion,
                suggestion: check.suggestion,
                severity: check.severity
            });
        }

        return results;
    }

    // Scan from pom.xml
    async scanJavaProject(content) {
        const dependencies = this.parsePomXml(content);
        const results = [];

        for (const [name, version] of Object.entries(dependencies)) {
            const check = this.checkDeprecated(name, version);
            
            results.push({
                name,
                currentVersion: version,
                isDeprecated: check.isDeprecated,
                isVulnerable: check.isVulnerable,
                latestVersion: check.latestVersion,
                suggestion: check.suggestion,
                severity: check.severity
            });
        }

        return results;
    }

    // Auto-detect project type and scan
    async scanProject(files) {
        // Check for package.json (Node.js)
        if (files.packageJson) {
            return {
                type: 'nodejs',
                dependencies: await this.scanNodeProject(files.packageJson)
            };
        }
        
        // Check for requirements.txt (Python)
        if (files.requirementsTxt) {
            return {
                type: 'python',
                dependencies: await this.scanPythonProject(files.requirementsTxt)
            };
        }
        
        // Check for pom.xml (Java/Maven)
        if (files.pomXml) {
            return {
                type: 'java',
                dependencies: await this.scanJavaProject(files.pomXml)
            };
        }

        return null;
    }

    // Calculate health score based on dependencies
    calculateHealthScore(dependencies) {
        if (!dependencies || dependencies.length === 0) return 100;

        let score = 100;
        let deductionPerIssue = 10;

        for (const dep of dependencies) {
            if (dep.isDeprecated) {
                score -= deductionPerIssue;
            }
            if (dep.isVulnerable) {
                score -= deductionPerIssue * 2;
            }
            if (dep.severity === 'critical') {
                score -= deductionPerIssue * 3;
            }
        }

        return Math.max(0, Math.min(100, score));
    }

    // Generate health report
    generateHealthReport(dependencies, healthScore) {
        const deprecatedList = dependencies.filter(d => d.isDeprecated);
        const vulnerableList = dependencies.filter(d => d.isVulnerable);
        
        return {
            healthScore,
            totalDependencies: dependencies.length,
            deprecatedCount: deprecatedList.length,
            vulnerableCount: vulnerableList.length,
            deprecatedList,
            vulnerableList,
            recommendations: deprecatedList.map(d => d.suggestion).filter(s => s),
            needsUpdate: deprecatedList.length > 0 || vulnerableList.length > 0
        };
    }

    // Add custom deprecated library (for Admin)
    addDeprecatedLibrary(libraryName, config) {
        this.deprecatedLibraries[libraryName.toLowerCase()] = config;
        return this.deprecatedLibraries;
    }

    // Get all deprecated libraries list
    getDeprecatedLibraries() {
        return this.deprecatedLibraries;
    }


    extractPackageJsonFromZip(zipBuffer) {
        try {
            const zip = new AdmZip(zipBuffer);
            const entries = zip.getEntries();
            
            for (const entry of entries) {
                const entryName = entry.entryName.toLowerCase();
                if (entryName === 'package.json' || entryName.endsWith('/package.json')) {
                    const content = entry.getData().toString('utf8');
                    console.log('✅ Found package.json in ZIP');
                    return content;
                }
            }
            console.log('⚠️ No package.json found in ZIP');
            return null;
        } catch (error) {
            console.error('Error extracting ZIP:', error.message);
            return null;
        }
    }

    // ✅ NEW: Main scan from ZIP buffer (for project upload)
    async scanFromZip(zipBuffer) {
        // Extract package.json from ZIP
        const packageJsonContent = this.extractPackageJsonFromZip(zipBuffer);
        
        if (!packageJsonContent) {
            return {
                success: false,
                message: 'No package.json found in ZIP file',
                type: null,
                dependencies: [],
                healthScore: 100,
                deprecatedCount: 0,
                vulnerableCount: 0,
                recommendations: []
            };
        }
        
        // Scan Node.js project
        const dependencies = await this.scanNodeProject(packageJsonContent);
        
        if (!dependencies || dependencies.length === 0) {
            return {
                success: true,
                message: 'No dependencies found in package.json',
                type: 'nodejs',
                dependencies: [],
                healthScore: 100,
                deprecatedCount: 0,
                vulnerableCount: 0,
                recommendations: []
            };
        }
        
        const healthScore = this.calculateHealthScore(dependencies);
        const deprecatedCount = dependencies.filter(d => d.isDeprecated).length;
        const vulnerableCount = dependencies.filter(d => d.isVulnerable).length;
        const recommendations = dependencies
            .filter(d => d.suggestion)
            .map(d => `${d.name}: ${d.suggestion}`);
        
        return {
            success: true,
            message: 'Dependency check completed',
            type: 'nodejs',
            dependencies,
            healthScore,
            deprecatedCount,
            vulnerableCount,
            recommendations,
            needsUpdate: deprecatedCount > 0 || vulnerableCount > 0
        };
    }
}

module.exports = new DependencyCheckService();