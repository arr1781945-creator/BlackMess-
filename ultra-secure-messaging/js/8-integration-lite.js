/**
 * Integration Module - LITE VERSION
 * Without IPFS (faster loading)
 */

class UltraSecureMessenger {
    constructor(config = {}) {
        this.e2ee = new SecureE2EE();
        this.pqc = new SecurePQC();
        this.zkp = new ZeroKnowledgeAuth();
        this.selfDestruct = new SelfDestruct();
        this.antiScreenshot = new AntiScreenshot();
        this.antiForensic = new AntiForensic();

        this.config = {
            enableE2EE: config.enableE2EE !== false,
            enablePQC: config.enablePQC !== false,
            enableZKP: config.enableZKP !== false,
            enableSelfDestruct: config.enableSelfDestruct !== false,
            enableAntiScreenshot: config.enableAntiScreenshot !== false,
            enableAntiForensic: config.enableAntiForensic !== false,
            sessionTimeout: config.sessionTimeout || 30,
            autoCleanup: config.autoCleanup !== false
        };

        this.isReady = false;
        this.currentUser = null;
    }

    async initialize(username, password) {
        try {
            console.log('🚀 Initializing Ultra Secure Messenger (Lite)...');

            const results = {};

            if (this.config.enableE2EE) {
                console.log('  🔐 E2EE...');
                results.e2ee = await this.e2ee.initialize();
            }

            if (this.config.enablePQC) {
                console.log('  🛡️ PQC...');
                results.pqc = await this.pqc.initialize();
            }

            if (this.config.enableZKP) {
                console.log('  🎭 ZKP...');
                results.zkp = await this.zkp.initialize();
                
                if (username && password) {
                    results.zkpRegistration = await this.zkp.register(username, password);
                    this.currentUser = username;
                }
            }

            if (this.config.enableAntiScreenshot) {
                console.log('  🚫 Anti-Screenshot...');
                results.antiScreenshot = this.antiScreenshot.enable();
            }

            if (this.config.enableAntiForensic) {
                console.log('  🔬 Anti-Forensic...');
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

            console.log('✅ All systems ready!');

            return {
                success: true,
                results: results,
                publicKeys: {
                    e2ee: results.e2ee?.publicKey,
                    pqc: results.pqc?.publicKey
                }
            };
        } catch (error) {
            console.error('❌ Init failed:', error);
            throw new Error(`System init failed: ${error.message}`);
        }
    }

    async sendMessage(recipientId, message, options = {}) {
        try {
            if (!this.isReady) throw new Error('Not initialized');

            console.log('📤 Sending message...');

            let encryptedData;
            let metadata = {
                from: this.currentUser,
                to: recipientId,
                timestamp: Date.now(),
                layers: []
            };

            if (this.config.enablePQC && options.quantumResistant) {
                console.log('  🛡️ PQC...');
                encryptedData = this.pqc.encrypt(message, options.recipientPQCKeys);
                metadata.layers.push('PQC');
            } else if (this.config.enableE2EE) {
                console.log('  🔐 E2EE...');
                encryptedData = this.e2ee.encrypt(
                    message, 
                    options.recipientPublicKey,
                    recipientId
                );
                metadata.layers.push('E2EE');
            } else {
                throw new Error('No encryption enabled');
            }

            if (this.config.enableSelfDestruct && options.selfDestruct) {
                console.log('  💣 Self-destruct...');
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

            return {
                success: true,
                data: {
                    encrypted: encryptedData,
                    metadata: metadata
                },
                layers: metadata.layers
            };

        } catch (error) {
            console.error('❌ Send failed:', error);
            throw new Error(`Send failed: ${error.message}`);
        }
    }

    async receiveMessage(encryptedPackage, options = {}) {
        try {
            if (!this.isReady) throw new Error('Not initialized');

            console.log('📥 Receiving message...');

            const messageData = encryptedPackage.data || encryptedPackage;
            const metadata = messageData.metadata || {};
            const encrypted = messageData.encrypted;

            if (metadata.selfDestruct && this.config.enableSelfDestruct) {
                console.log('  💣 Self-destruct active...');
                this.selfDestruct.markAsRead(metadata.messageId);
            }

            let decryptedMessage;

            if (metadata.layers?.includes('PQC')) {
                console.log('  🛡️ Decrypting PQC...');
                decryptedMessage = this.pqc.decrypt(encrypted, options.senderPQCKeys);
            } else if (metadata.layers?.includes('E2EE')) {
                console.log('  🔐 Decrypting E2EE...');
                decryptedMessage = this.e2ee.decrypt(encrypted, options.senderPublicKey);
            } else {
                throw new Error('Unknown encryption');
            }

            return {
                message: decryptedMessage,
                metadata: metadata,
                from: metadata.from,
                timestamp: metadata.timestamp
            };

        } catch (error) {
            console.error('❌ Receive failed:', error);
            throw new Error(`Receive failed: ${error.message}`);
        }
    }

    protectElement(element) {
        if (this.config.enableAntiScreenshot) {
            this.antiScreenshot.protect(element);
        }
    }

    emergencyCleanup() {
        console.error('🚨 EMERGENCY CLEANUP 🚨');

        if (this.config.enableSelfDestruct) {
            this.selfDestruct.destroyAll();
        }

        if (this.config.enableAntiForensic) {
            this.antiForensic.completeCleanup();
        }

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

    onSessionTimeout() {
        console.warn('⏰ Session timeout');
        this.emergencyCleanup();
        window.location.href = 'about:blank';
    }

    getSecurityStatus() {
        return {
            ready: this.isReady,
            user: this.currentUser,
            features: {
                e2ee: this.config.enableE2EE && this.e2ee.keyPair !== null,
                pqc: this.config.enablePQC && this.pqc.ready,
                zkp: this.config.enableZKP && this.zkp.ready,
                selfDestruct: this.config.enableSelfDestruct,
                antiScreenshot: this.config.enableAntiScreenshot && this.antiScreenshot.isActive,
                antiForensic: this.config.enableAntiForensic
            },
            layers: Object.keys(this.config).filter(k => this.config[k] === true).length
        };
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

console.log('✅ Integration Lite loaded');
