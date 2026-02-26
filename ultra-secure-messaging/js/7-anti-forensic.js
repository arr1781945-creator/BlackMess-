/**
 * Anti-Forensic Module
 * Prevents data recovery and forensic analysis
 * Secure deletion and trace removal
 */

class AntiForensic {
    constructor() {
        this.cleanupHandlers = [];
        this.sessionTimeout = null;
        this.autoCleanupInterval = null;
    }

    /**
     * Initialize anti-forensic measures
     */
    initialize() {
        // Prevent browser caching
        this.preventCaching();

        // Prevent browser history
        this.preventHistory();

        // Clear on unload
        this.setupUnloadHandlers();

        // Clear cookies on session end
        this.setupCookieCleanup();

        return { success: true };
    }

    /**
     * Prevent browser caching
     */
    preventCaching() {
        // Add meta tags
        const meta1 = document.createElement('meta');
        meta1.httpEquiv = 'Cache-Control';
        meta1.content = 'no-cache, no-store, must-revalidate';
        document.head.appendChild(meta1);

        const meta2 = document.createElement('meta');
        meta2.httpEquiv = 'Pragma';
        meta2.content = 'no-cache';
        document.head.appendChild(meta2);

        const meta3 = document.createElement('meta');
        meta3.httpEquiv = 'Expires';
        meta3.content = '0';
        document.head.appendChild(meta3);

        // Prevent back/forward cache
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                window.location.reload();
            }
        });
    }

    /**
     * Prevent browser history
     */
    preventHistory() {
        // Replace history state
        if (window.history && window.history.pushState) {
            window.history.pushState(null, '', window.location.href);
            
            window.addEventListener('popstate', () => {
                window.history.pushState(null, '', window.location.href);
            });
        }
    }

    /**
     * Setup unload handlers
     */
    setupUnloadHandlers() {
        const cleanup = () => {
            this.completeCleanup();
        };

        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('unload', cleanup);
        window.addEventListener('pagehide', cleanup);

        // Mobile support
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cleanup();
            }
        });
    }

    /**
     * Setup cookie cleanup
     */
    setupCookieCleanup() {
        // Clear all cookies
        const clearCookies = () => {
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
        };

        window.addEventListener('beforeunload', clearCookies);
    }

    /**
     * Secure wipe data
     * Overwrites data multiple times before deletion
     */
    secureWipe(data) {
        if (!data) return;

        // For strings
        if (typeof data === 'string') {
            const length = data.length;
            
            // Overwrite multiple times
            for (let i = 0; i < 7; i++) {
                data = this.generateRandomString(length);
            }
            
            return null;
        }

        // For objects
        if (typeof data === 'object') {
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string') {
                    const length = data[key].length;
                    for (let i = 0; i < 7; i++) {
                        data[key] = this.generateRandomString(length);
                    }
                }
                delete data[key];
            });
        }

        return null;
    }

    /**
     * Clear all storage
     */
    clearAllStorage() {
        try {
            // LocalStorage
            const lsKeys = Object.keys(localStorage);
            lsKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    // Overwrite before delete
                    for (let i = 0; i < 7; i++) {
                        localStorage.setItem(key, this.generateRandomString(value.length));
                    }
                }
                localStorage.removeItem(key);
            });
            localStorage.clear();

            // SessionStorage
            const ssKeys = Object.keys(sessionStorage);
            ssKeys.forEach(key => {
                const value = sessionStorage.getItem(key);
                if (value) {
                    for (let i = 0; i < 7; i++) {
                        sessionStorage.setItem(key, this.generateRandomString(value.length));
                    }
                }
                sessionStorage.removeItem(key);
            });
            sessionStorage.clear();

            // Cookies
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // IndexedDB
            this.clearIndexedDB();

            return { success: true };
        } catch (error) {
            console.error('Storage cleanup error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear IndexedDB
     */
    async clearIndexedDB() {
        try {
            const dbs = await indexedDB.databases();
            
            for (const dbInfo of dbs) {
                indexedDB.deleteDatabase(dbInfo.name);
            }
        } catch (error) {
            console.warn('IndexedDB cleanup error:', error);
        }
    }

    /**
     * Clear DOM
     */
    clearDOM() {
        // Overwrite text content
        const textNodes = document.evaluate(
            "//text()[normalize-space()]",
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < textNodes.snapshotLength; i++) {
            const node = textNodes.snapshotItem(i);
            const length = node.textContent.length;
            node.textContent = this.generateRandomString(length);
        }

        // Clear input values
        document.querySelectorAll('input, textarea').forEach(input => {
            const length = input.value.length;
            for (let i = 0; i < 7; i++) {
                input.value = this.generateRandomString(length);
            }
            input.value = '';
        });
    }

    /**
     * Clear memory variables
     */
    clearMemory() {
        // Clear global variables
        if (typeof window !== 'undefined') {
            const globals = Object.keys(window);
            
            globals.forEach(key => {
                try {
                    if (window[key] && typeof window[key] === 'object') {
                        this.secureWipe(window[key]);
                        window[key] = null;
                    }
                } catch (e) {
                    // Some properties are read-only
                }
            });
        }

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Complete cleanup (nuclear option)
     */
    completeCleanup() {
        console.warn('🔥 Complete forensic cleanup initiated');

        // Call all registered cleanup handlers
        this.cleanupHandlers.forEach(handler => {
            try {
                handler();
            } catch (error) {
                console.error('Cleanup handler error:', error);
            }
        });

        // Clear storage
        this.clearAllStorage();

        // Clear DOM
        this.clearDOM();

        // Clear memory
        this.clearMemory();

        return { success: true, cleaned: true };
    }

    /**
     * Register cleanup handler
     */
    registerCleanupHandler(handler) {
        if (typeof handler === 'function') {
            this.cleanupHandlers.push(handler);
        }
    }

    /**
     * Setup session timeout
     */
    setupSessionTimeout(minutes, onTimeout) {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }

        this.sessionTimeout = setTimeout(() => {
            console.warn('Session timeout - auto cleanup');
            this.completeCleanup();
            
            if (onTimeout) {
                onTimeout();
            }
        }, minutes * 60 * 1000);
    }

    /**
     * Reset session timeout
     */
    resetSessionTimeout(minutes, onTimeout) {
        this.setupSessionTimeout(minutes, onTimeout);
    }

    /**
     * Enable auto cleanup
     */
    enableAutoCleanup(intervalMinutes = 30) {
        this.autoCleanupInterval = setInterval(() => {
            console.log('Auto cleanup running...');
            this.clearAllStorage();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Disable auto cleanup
     */
    disableAutoCleanup() {
        if (this.autoCleanupInterval) {
            clearInterval(this.autoCleanupInterval);
            this.autoCleanupInterval = null;
        }
    }

    /**
     * Generate random string for overwriting
     */
    generateRandomString(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Panic button - immediate complete wipe
     */
    panic() {
        console.error('🚨 PANIC MODE ACTIVATED 🚨');
        
        this.completeCleanup();
        
        // Redirect to blank page
        window.location.replace('about:blank');
    }
}

console.log('✅ Anti-Forensic Module loaded');
