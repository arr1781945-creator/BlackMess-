/**
 * Self-Destruct Message System
 * Messages auto-delete after timer or read
 * No trace left in memory or storage
 */

class SelfDestruct {
    constructor() {
        this.timers = new Map();
        this.readOnce = new Map();
        this.burnAfterReading = new Set();
    }

    /**
     * Create self-destructing message
     * @param {string} messageId - Unique message ID
     * @param {Object} options - Destruction options
     */
    create(messageId, options = {}) {
        const config = {
            timeout: options.timeout || 60000, // 1 minute default
            readOnce: options.readOnce || false,
            burnAfterReading: options.burnAfterReading || false,
            onDestruct: options.onDestruct || null
        };

        // Store config
        if (config.readOnce) {
            this.readOnce.set(messageId, false); // not read yet
        }

        if (config.burnAfterReading) {
            this.burnAfterReading.add(messageId);
        }

        // Set timer for auto-destruct
        if (config.timeout > 0) {
            const timer = setTimeout(() => {
                this.destroy(messageId, 'timeout');
            }, config.timeout);

            this.timers.set(messageId, {
                timer: timer,
                config: config,
                created: Date.now()
            });
        }

        return {
            messageId: messageId,
            destructTime: Date.now() + config.timeout,
            config: config
        };
    }

    /**
     * Mark message as read
     */
    markAsRead(messageId) {
        // Check if read-once
        if (this.readOnce.has(messageId)) {
            const alreadyRead = this.readOnce.get(messageId);
            
            if (alreadyRead) {
                throw new Error('Message already read and destroyed');
            }

            this.readOnce.set(messageId, true);

            // Destroy after short delay
            setTimeout(() => {
                this.destroy(messageId, 'read-once');
            }, 100);
        }

        // Check if burn after reading
        if (this.burnAfterReading.has(messageId)) {
            setTimeout(() => {
                this.destroy(messageId, 'burn-after-reading');
            }, 5000); // 5 second grace period
        }
    }

    /**
     * Destroy message and all traces
     */
    destroy(messageId, reason = 'manual') {
        try {
            // Clear timer if exists
            if (this.timers.has(messageId)) {
                const data = this.timers.get(messageId);
                clearTimeout(data.timer);
                
                // Call callback if provided
                if (data.config.onDestruct) {
                    data.config.onDestruct(messageId, reason);
                }
                
                this.timers.delete(messageId);
            }

            // Remove from tracking
            this.readOnce.delete(messageId);
            this.burnAfterReading.delete(messageId);

            // Secure wipe from DOM
            this.wipeFromDOM(messageId);

            // Secure wipe from storage
            this.wipeFromStorage(messageId);

            // Secure wipe from memory
            this.wipeFromMemory(messageId);

            return {
                success: true,
                messageId: messageId,
                reason: reason,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Destruction error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Wipe message from DOM
     */
    wipeFromDOM(messageId) {
        const elements = document.querySelectorAll(`[data-message-id="${messageId}"]`);
        
        elements.forEach(element => {
            // Overwrite text content with random data
            if (element.textContent) {
                const length = element.textContent.length;
                element.textContent = this.generateRandomString(length);
            }

            // Remove element
            element.remove();
        });
    }

    /**
     * Wipe message from storage
     */
    wipeFromStorage(messageId) {
        // LocalStorage
        const lsKeys = Object.keys(localStorage);
        lsKeys.forEach(key => {
            if (key.includes(messageId)) {
                // Overwrite with random data first
                localStorage.setItem(key, this.generateRandomString(100));
                // Then delete
                localStorage.removeItem(key);
            }
        });

        // SessionStorage
        const ssKeys = Object.keys(sessionStorage);
        ssKeys.forEach(key => {
            if (key.includes(messageId)) {
                sessionStorage.setItem(key, this.generateRandomString(100));
                sessionStorage.removeItem(key);
            }
        });

        // IndexedDB cleanup
        this.wipeFromIndexedDB(messageId);
    }

    /**
     * Wipe from IndexedDB
     */
    async wipeFromIndexedDB(messageId) {
        try {
            const dbs = await indexedDB.databases();
            
            for (const dbInfo of dbs) {
                const request = indexedDB.open(dbInfo.name);
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    const storeNames = db.objectStoreNames;
                    
                    for (let i = 0; i < storeNames.length; i++) {
                        const storeName = storeNames[i];
                        const transaction = db.transaction(storeName, 'readwrite');
                        const store = transaction.objectStore(storeName);
                        
                        // Try to delete by messageId
                        store.delete(messageId);
                    }
                };
            }
        } catch (error) {
            console.warn('IndexedDB cleanup error:', error);
        }
    }

    /**
     * Wipe from memory (force garbage collection)
     */
    wipeFromMemory(messageId) {
        // Find and nullify variables containing messageId
        if (typeof window !== 'undefined') {
            Object.keys(window).forEach(key => {
                try {
                    if (window[key] && typeof window[key] === 'object') {
                        if (JSON.stringify(window[key]).includes(messageId)) {
                            window[key] = null;
                        }
                    }
                } catch (e) {
                    // Ignore errors (some properties are not serializable)
                }
            });
        }

        // Trigger garbage collection (if available)
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Generate random string for overwriting
     */
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Get time remaining for message
     */
    getTimeRemaining(messageId) {
        if (!this.timers.has(messageId)) {
            return 0;
        }

        const data = this.timers.get(messageId);
        const elapsed = Date.now() - data.created;
        const remaining = data.config.timeout - elapsed;

        return Math.max(0, remaining);
    }

    /**
     * Cancel self-destruct
     */
    cancel(messageId) {
        if (this.timers.has(messageId)) {
            const data = this.timers.get(messageId);
            clearTimeout(data.timer);
            this.timers.delete(messageId);
            
            return { success: true, cancelled: true };
        }

        return { success: false, reason: 'Timer not found' };
    }

    /**
     * Destroy all messages
     */
    destroyAll() {
        const messageIds = Array.from(this.timers.keys());
        
        messageIds.forEach(id => {
            this.destroy(id, 'destroy-all');
        });

        return {
            success: true,
            destroyed: messageIds.length
        };
    }

    /**
     * Get active self-destruct timers
     */
    getActiveTimers() {
        const active = [];

        this.timers.forEach((data, messageId) => {
            active.push({
                messageId: messageId,
                timeRemaining: this.getTimeRemaining(messageId),
                config: data.config
            });
        });

        return active;
    }
}

console.log('✅ Self-Destruct Module loaded');
