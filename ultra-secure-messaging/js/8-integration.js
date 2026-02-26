/**
 * Integration Module
 * Combines all security features into one unified system
 * Orchestrates E2EE, PQC, ZKP, IPFS, Self-Destruct, Anti-Screenshot, Anti-Forensic
 */

class UltraSecureMessenger {
    constructor(config = {}) {
        // Initialize all modules
        this.e2ee = new SecureE2EE();
        this.pqc = new SecurePQC();
        this.zkp = new ZeroKnowledgeAuth();
        this.ipfs = new IPFSStorage(config.ipfs || {});
        this.selfDestruct = new SelfDestruct();
        this.antiScreenshot = new AntiScreenshot();
        this.antiForensic = new AntiForensic();

        // Configuration
        this.config = {
            enableE2EE: config.enableE2EE !== false,
            enablePQC: config.enablePQC !== false,
            enableZKP: config.enableZKP !== false,
            enableIPFS: config.enableIPFS !== false,
            enableSelfDestruct: config.enableSelfDestruct !== false,
            enableAntiScreenshot: config.enableAntiScreenshot !== false,
            enableAntiForensic: config.enableAntiForensic !== false,
            sessionTimeout: config.sessionTimeout || 30,
            autoCleanup: config.autoCleanup !== false
        };

        this.isReady = false;
        this.currentUser = null;
    }

    /**
     * Initialize entire system
     */
    async initialize(username, password) {
        try {
            console.log('🚀 Initializing Ultra Secure Messenger...');

            const results = {};

            // 1. Initialize E2EE
            if (this.config.enableE2EE) {
                console.log('  🔐 Initializing E2EE...');
                results.e2ee = await this.e2ee.initialize();
            }

            // 2. Initialize PQC
            if (this.config.enablePQC) {
                console.log('  🛡️ Initializing Post-Quantum Crypto...');
                results.pqc = await this.pqc.initialize();
            }

            // 3. Initialize Zero-Knowledge Proof
            if (this.config.enableZKP) {
                console.log('  🎭 Initializing Zero-Knowledge Auth...');
                results.zkp = await this.zkp.initialize();
                
                // Auto-register if first time
                if (username && password) {
                    results.zkpRegistration = await this.zkp.register(username, password);
                    this.currentUser = username;
                }
            }

            // 4. Initialize IPFS
            if (this.config.enableIPFS) {
                console.log('  📦 Initializing IPFS Storage...');
                results.ipfs = await this.ipfs.initialize();
            }

            // 5. Enable Anti-Screenshot
            if (this.config.enableAntiScreenshot) {
                console.log('  🚫 Enabling Anti-Screenshot...');
                results.antiScreenshot = this.antiScreenshot.enable();
            }

            // 6. Initialize Anti-Forensic
            if (this.config.enableAntiForensic) {
                console.log('  🔬 Initializing Anti-Forensic...');
                results.antiForensic = this.antiForensic.initialize();
                
                if (this.config.autoCleanup) {
                    this.antiForensic.enableAutoCleanup(30);
                }
                
                if (this.config.sessionTimeout) {
                    this.antiForensic.setupSessionTimeout(
                        this.config.sessionTimeout,
                        () => this.onSessionTimeout()
                    );
                }
            }

            this.isReady = true;

            console.log('✅ All systems initialized successfully!');

            return {
                success: true,
                results: results,
                publicKeys: {
                    e2ee: results.e2ee?.publicKey,
                    pqc: results.pqc?.publicKey
                }
            };
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }

    /**
     * Send ultra-secure message
     * Uses all enabled security layers
     */
    async sendMessage(recipientId, message, options = {}) {
        try {
            if (!this.isReady) throw new Error('System not initialized');

            console.log('📤 Sending ultra-secure message...');

            let encryptedData;
            let metadata = {
                from: this.currentUser,
                to: recipientId,
                timestamp: Date.now(),
                layers: []
            };

            // Layer 1: E2EE or PQC Encryption
            if (this.config.enablePQC && options.quantumResistant) {
                console.log('  🛡️ Applying PQC encryption...');
                encryptedData = this.pqc.encrypt(message, options.recipientPQCKeys);
                metadata.layers.push('PQC');
            } else if (this.config.enableE2EE) {
                console.log('  🔐 Applying E2EE encryption...');
                encryptedData = this.e2ee.encrypt(
                    message, 
                    options.recipientPublicKey,
                    recipientId
                );
                metadata.layers.push('E2EE');
            } else {
                throw new Error('No encryption method enabled');
            }

            // Layer 2: Self-Destruct
            if (this.config.enableSelfDestruct && options.selfDestruct) {
                console.log('  💣 Setting self-destruct timer...');
                const messageId = this.generateMessageId();
                
                const destructConfig = this.selfDestruct.create(messageId, {
                    timeout: options.destructTimeout || 60000,
                    readOnce: options.readOnce || false,
                    burnAfterReading: options.burnAfterReading || false
                });

                metadata.messageId = messageId;
                metadata.selfDestruct = destructConfig;
                metadata.layers.push('SelfDestruct');
            }

            // Package everything
            const messagePackage = {
                encrypted: encryptedData,
                metadata: metadata
            };

            // Layer 3: IPFS Storage (optional)
            if (this.config.enableIPFS && options.useIPFS) {
                console.log('  📦 Uploading to IPFS...');
                const ipfsResult = await this.ipfs.uploadJSON(messagePackage, true);
                
                metadata.layers.push('IPFS');
                
                return {
                    success: true,
                    cid: ipfsResult.cid,
                    gateway: ipfsResult.gateway,
                    encryptionKey: ipfsResult.encryptionKey,
                    layers: metadata.layers
                };
            }

            // Return encrypted package
            return {
                success: true,
                data: messagePackage,
                layers: metadata.layers
            };

        } catch (error) {
            console.error('❌ Send message failed:', error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    /**
     * Receive and decrypt ultra-secure message
     */
    async receiveMessage(encryptedPackage, options = {}) {
        try {
            if (!this.isReady) throw new Error('System not initialized');

            console.log('📥 Receiving ultra-secure message...');

            let messageData = encryptedPackage;

            // If from IPFS, download first
            if (encryptedPackage.cid) {
                console.log('  📦 Downloading from IPFS...');
                messageData = await this.ipfs.downloadJSON(
                    encryptedPackage.cid,
                    encryptedPackage.encryptionKey
                );
            } else if (encryptedPackage.data) {
                messageData = encryptedPackage.data;
            }

            const metadata = messageData.metadata || {};
            const encrypted = messageData.encrypted;

            // Check self-destruct
            if (metadata.selfDestruct && this.config.enableSelfDestruct) {
                console.log('  💣 Self-destruct active...');
                this.selfDestruct.markAsRead(metadata.messageId);
            }

            // Decrypt based on method
            let decryptedMessage;

            if (metadata.layers?.includes('PQC')) {
                console.log('  🛡️ Decrypting PQC...');
                decryptedMessage = this.pqc.decrypt(
                    encrypted,
                    options.senderPQCKeys
                );
            } else if (metadata.layers?.includes('E2EE')) {
                console.log('  🔐 Decrypting E2EE...');
                decryptedMessage = this.e2ee.decrypt(
                    encrypted,
                    options.senderPublicKey
                );
            } else {
                throw new Error('Unknown encryption method');
            }

            return {
                message: decryptedMessage,
                metadata: metadata,
                from: metadata.from,
                timestamp: metadata.timestamp
            };

        } catch (error) {
            console.error('❌ Receive message failed:', error);
            throw new Error(`Failed to receive message: ${error.message}`);
        }
    }

    /**
     * Authenticate user with Zero-Knowledge Proof
     */
    async authenticate(username, password) {
        try {
            if (!this.config.enableZKP) {
                throw new Error('Zero-Knowledge auth not enabled');
            }

            console.log('🎭 Authenticating with Zero-Knowledge Proof...');

            // In production, get server data first
            const serverData = {
                salt: 'stored_salt_from_server', // Would come from server
                challenge: this.generateChallenge()
            };

            const authResult = await this.zkp.authenticate(username, password, serverData);

            this.currentUser = username;

            return {
                success: true,
                authData: authResult
            };

        } catch (error) {
            console.error('❌ Authentication failed:', error);
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Protect element from screenshots
     */
    protectElement(element) {
        if (this.config.enableAntiScreenshot) {
            this.antiScreenshot.protect(element);
        }
    }

    /**
     * Emergency cleanup (panic button)
     */
    emergencyCleanup() {
        console.error('🚨 EMERGENCY CLEANUP TRIGGERED 🚨');

        // Destroy all messages
        if (this.config.enableSelfDestruct) {
            this.selfDestruct.destroyAll();
        }

        // Complete forensic cleanup
        if (this.config.enableAntiForensic) {
            this.antiForensic.completeCleanup();
        }

        // Destroy all crypto keys
        if (this.config.enableE2EE) {
            this.e2ee.destroy();
        }

        if (this.config.enablePQC) {
            this.pqc.destroy();
        }

        if (this.config.enableZKP) {
            this.zkp.destroy();
        }

        return { success: true, cleaned: true };
    }

    /**
     * Session timeout handler
     */
    onSessionTimeout() {
        console.warn('⏰ Session timeout - auto cleanup');
        this.emergencyCleanup();
        
        // Redirect or show login
        if (typeof window !== 'undefined') {
            window.location.href = 'about:blank';
        }
    }

    /**
     * Get security status
     */
    getSecurityStatus() {
        return {
            ready: this.isReady,
            user: this.currentUser,
            features: {
                e2ee: this.config.enableE2EE && this.e2ee.keyPair !== null,
                pqc: this.config.enablePQC && this.pqc.ready,
                zkp: this.config.enableZKP && this.zkp.ready,
                ipfs: this.config.enableIPFS && this.ipfs.ready,
                selfDestruct: this.config.enableSelfDestruct,
                antiScreenshot: this.config.enableAntiScreenshot && this.antiScreenshot.isActive,
                antiForensic: this.config.enableAntiForensic
            },
            layers: Object.keys(this.config).filter(k => this.config[k] === true).length
        };
    }

    /**
     * Generate message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate challenge for ZKP
     */
    generateChallenge() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array));
    }

    /**
     * Export configuration
     */
    exportConfig() {
        return {
            ...this.config,
            publicKeys: {
                e2ee: this.e2ee.keyPair ? this.e2ee.exportPublicKey() : null,
                pqc: this.pqc.ready ? this.pqc.exportPublicKey() : null
            }
        };
    }
}

console.log('✅ Integration Module loaded - All systems ready!');
