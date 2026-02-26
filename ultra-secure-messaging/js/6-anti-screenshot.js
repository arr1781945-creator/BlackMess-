/**
 * Anti-Screenshot Protection
 * Prevents screenshots and screen recording
 * Multiple layers of protection
 */

class AntiScreenshot {
    constructor() {
        this.isActive = false;
        this.protectedElements = new Set();
        this.observers = [];
        this.watermarkInterval = null;
    }

    /**
     * Enable anti-screenshot protection
     */
    enable() {
        if (this.isActive) return;

        // Layer 1: CSS-based protection
        this.applyCSSProtection();

        // Layer 2: Canvas fingerprint randomization
        this.enableCanvasProtection();

        // Layer 3: Screenshot detection
        this.enableScreenshotDetection();

        // Layer 4: Dynamic watermark
        this.enableDynamicWatermark();

        // Layer 5: Content scrambling on visibility change
        this.enableVisibilityProtection();

        this.isActive = true;

        return { success: true, protection: 'enabled' };
    }

    /**
     * Layer 1: CSS Protection
     */
    applyCSSProtection() {
        const style = document.createElement('style');
        style.id = 'anti-screenshot-css';
        style.textContent = `
            .protected-content {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                
                -webkit-touch-callout: none;
                
                /* Prevent copy */
                -webkit-user-drag: none;
                -khtml-user-drag: none;
                -moz-user-drag: none;
                -o-user-drag: none;
                
                /* Screenshot detection helper */
                pointer-events: auto;
            }

            /* Blur on print */
            @media print {
                .protected-content {
                    filter: blur(10px);
                    opacity: 0;
                }
            }

            /* Dynamic watermark */
            .dynamic-watermark {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
                opacity: 0.1;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 100px,
                    rgba(255,0,0,0.1) 100px,
                    rgba(255,0,0,0.1) 200px
                );
                animation: watermarkMove 10s linear infinite;
            }

            @keyframes watermarkMove {
                0% { background-position: 0 0; }
                100% { background-position: 200px 200px; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Layer 2: Canvas Protection
     */
    enableCanvasProtection() {
        const original = HTMLCanvasElement.prototype.toDataURL;
        
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
            // Add noise to canvas to prevent fingerprinting
            const ctx = this.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, this.width, this.height);
                const data = imageData.data;
                
                // Add random noise
                for (let i = 0; i < data.length; i += 4) {
                    data[i] += Math.random() * 10 - 5;     // R
                    data[i + 1] += Math.random() * 10 - 5; // G
                    data[i + 2] += Math.random() * 10 - 5; // B
                }
                
                ctx.putImageData(imageData, 0, 0);
            }
            
            return original.apply(this, args);
        };
    }

    /**
     * Layer 3: Screenshot Detection
     */
    enableScreenshotDetection() {
        // Detect visibility API (screenshots often trigger this)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onPossibleScreenshot('visibility-change');
            }
        });

        // Detect keyboard shortcuts (Windows: Win+PrtScn, Mac: Cmd+Shift+3/4)
        document.addEventListener('keyup', (e) => {
            // Windows screenshot
            if (e.key === 'PrintScreen') {
                this.onPossibleScreenshot('print-screen');
            }

            // Mac screenshot (Cmd+Shift+3 or 4)
            if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) {
                this.onPossibleScreenshot('mac-screenshot');
            }
        });

        // Detect screen recording APIs
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
            
            navigator.mediaDevices.getDisplayMedia = async function(...args) {
                console.warn('⚠️ Screen recording detected!');
                // You can block or watermark here
                return originalGetDisplayMedia.apply(this, args);
            };
        }
    }

    /**
     * Handle possible screenshot
     */
    onPossibleScreenshot(method) {
        console.warn(`⚠️ Possible screenshot detected via: ${method}`);

        // Scramble content temporarily
        this.scrambleContent();

        // Trigger event for app to handle
        const event = new CustomEvent('screenshot-attempt', {
            detail: { method: method, timestamp: Date.now() }
        });
        document.dispatchEvent(event);

        // Restore content after delay
        setTimeout(() => {
            this.unscrambleContent();
        }, 500);
    }

    /**
     * Layer 4: Dynamic Watermark
     */
    enableDynamicWatermark() {
        // Create watermark overlay
        const watermark = document.createElement('div');
        watermark.className = 'dynamic-watermark';
        watermark.id = 'anti-screenshot-watermark';
        
        // Add user info and timestamp
        const info = document.createElement('div');
        info.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(255, 0, 0, 0.1);
            white-space: nowrap;
            pointer-events: none;
            font-weight: bold;
            letter-spacing: 20px;
        `;
        
        watermark.appendChild(info);
        document.body.appendChild(watermark);

        // Update watermark text every second
        this.watermarkInterval = setInterval(() => {
            const timestamp = new Date().toISOString();
            const userId = this.getUserId();
            info.textContent = `${userId} • ${timestamp}`;
        }, 1000);
    }

    /**
     * Layer 5: Visibility Protection
     */
    enableVisibilityProtection() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    // Element not visible, might be screenshot attempt
                    const element = entry.target;
                    if (element.classList.contains('protected-content')) {
                        element.style.filter = 'blur(20px)';
                    }
                } else {
                    entry.target.style.filter = 'none';
                }
            });
        });

        this.observers.push(observer);

        // Observe all protected elements
        document.querySelectorAll('.protected-content').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Protect specific element
     */
    protect(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }

        if (!element) return;

        element.classList.add('protected-content');
        this.protectedElements.add(element);

        // Add context menu prevention
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Add drag prevention
        element.addEventListener('dragstart', (e) => {
            e.preventDefault();
            return false;
        });
    }

    /**
     * Scramble content
     */
    scrambleContent() {
        this.protectedElements.forEach(element => {
            if (element.dataset.original === undefined) {
                element.dataset.original = element.textContent;
            }
            
            element.textContent = this.generateGibberish(element.textContent.length);
            element.style.filter = 'blur(10px)';
        });
    }

    /**
     * Unscramble content
     */
    unscrambleContent() {
        this.protectedElements.forEach(element => {
            if (element.dataset.original) {
                element.textContent = element.dataset.original;
                delete element.dataset.original;
            }
            element.style.filter = 'none';
        });
    }

    /**
     * Generate gibberish text
     */
    generateGibberish(length) {
        const chars = '█▓▒░█▓▒░█▓▒░';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }

    /**
     * Get user ID for watermark
     */
    getUserId() {
        // In production, use actual user ID
        return localStorage.getItem('userId') || 'ANONYMOUS';
    }

    /**
     * Disable protection
     */
    disable() {
        // Remove CSS
        const style = document.getElementById('anti-screenshot-css');
        if (style) style.remove();

        // Remove watermark
        const watermark = document.getElementById('anti-screenshot-watermark');
        if (watermark) watermark.remove();

        // Clear interval
        if (this.watermarkInterval) {
            clearInterval(this.watermarkInterval);
        }

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        // Remove protection from elements
        this.protectedElements.forEach(element => {
            element.classList.remove('protected-content');
        });
        this.protectedElements.clear();

        this.isActive = false;

        return { success: true, protection: 'disabled' };
    }
}

console.log('✅ Anti-Screenshot Module loaded');
