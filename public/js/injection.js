// Injection Engine for CSS/JS/HTML
class InjectionEngine {
    constructor() {
        this.activeInjections = new Map();
    }

    // Apply injection to an iframe
    applyToIframe(iframe, injection) {
        if (!iframe || !injection) return;
        
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            
            // Apply CSS
            if (injection.css) {
                this.injectCSS(doc, injection.css);
            }
            
            // Apply HTML
            if (injection.html) {
                this.injectHTML(doc, injection.html);
            }
            
            // Apply JS
            if (injection.js) {
                this.injectJS(doc, injection.js);
            }
        } catch (e) {
            console.error('Injection error:', e);
        }
    }

    injectCSS(doc, css) {
        const style = doc.createElement('style');
        style.id = 'tachi-injected-css';
        style.textContent = css;
        
        // Remove existing injected CSS
        const existing = doc.getElementById('tachi-injected-css');
        if (existing) existing.remove();
        
        doc.head.appendChild(style);
    }

    injectHTML(doc, html) {
        // Create container for injected HTML
        let container = doc.getElementById('tachi-injected-html');
        if (!container) {
            container = doc.createElement('div');
            container.id = 'tachi-injected-html';
            doc.body.appendChild(container);
        }
        container.innerHTML = html;
    }

    injectJS(doc, js) {
        const script = doc.createElement('script');
        script.id = 'tachi-injected-js';
        script.textContent = `(function() { ${js} })();`;
        
        // Remove existing injected script
        const existing = doc.getElementById('tachi-injected-js');
        if (existing) existing.remove();
        
        doc.body.appendChild(script);
    }

    // Get matching injection based on URL and repo config
    getMatchingInjection(repo, url) {
        if (!repo || !repo.injections) return null;
        
        const urlObj = new URL(url);
        const fullPath = urlObj.pathname + urlObj.search;
        
        // Check subdomain-specific injections
        for (const sub of repo.injections.subdomains || []) {
            if (this.matchesPattern(fullPath, sub.pattern, sub.regex)) {
                return {
                    css: this.mergeValue(repo.injections.default?.css, sub.css),
                    html: this.mergeValue(repo.injections.default?.html, sub.html),
                    js: this.mergeValue(repo.injections.default?.js, sub.js)
                };
            }
        }
        
        // Return default injection
        return repo.injections.default;
    }

    matchesPattern(path, pattern, isRegex) {
        if (!pattern) return false;
        
        if (isRegex !== false) {
            // Treat as regex by default
            try {
                const patterns = pattern.split('|').map(p => p.trim());
                return patterns.some(p => {
                    const regex = new RegExp(p, 'i');
                    return regex.test(path);
                });
            } catch (e) {
                console.error('Invalid regex pattern:', pattern);
                return false;
            }
        }
        
        // Exact match
        return path.includes(pattern);
    }

    mergeValue(base, override) {
        if (!base && !override) return '';
        if (!base) return override;
        if (!override) return base;
        return `${base}\n/* --- Subdomain Override --- */\n${override}`;
    }

    // Preview injection by creating a modified HTML string
    createPreviewHTML(originalHTML, injection) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(originalHTML, 'text/html');
        
        // Apply CSS
        if (injection.css) {
            const style = doc.createElement('style');
            style.textContent = injection.css;
            doc.head.appendChild(style);
        }
        
        // Apply HTML
        if (injection.html) {
            const container = doc.createElement('div');
            container.id = 'tachi-injected-html';
            container.innerHTML = injection.html;
            doc.body.appendChild(container);
        }
        
        // Note: JS injection in preview is limited for security
        
        return doc.documentElement.outerHTML;
    }
}

// Initialize global instance
window.injectionEngine = new InjectionEngine();
