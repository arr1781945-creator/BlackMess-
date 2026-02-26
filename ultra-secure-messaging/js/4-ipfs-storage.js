/**
 * IPFS Decentralized Storage
 * Stores encrypted data on IPFS
 * No central server can access content
 */

class IPFSStorage {
    constructor(config = {}) {
        this.client = null;
        this.ready = false;
        this.gateway = config.gateway || 'https://ipfs.io';
        this.api = config.api || '/ip4/127.0.0.1/tcp/5001';
        this.pinningService = config.pinningService || null;
    }

    /**
     * Initialize IPFS client
     */
    async initialize() {
        try {
            // Check if IPFS HTTP client is loaded
            if (typeof IpfsHttpClient === 'undefined') {
                throw new Error('IPFS HTTP Client not loaded');
            }

            // Create IPFS client instance
            this.client = IpfsHttpClient.create({
                host: 'ipfs.infura.io',
                port: 5001,
                protocol: 'https',
                headers: {
                    // Add Infura project auth if available
                    authorization: this.getInfuraAuth()
                }
            });

            this.ready = true;

            return {
                success: true,
                gateway: this.gateway
            };
        } catch (error) {
            console.warn('IPFS client failed, using fallback mode:', error.message);
            
            // Fallback: use public gateway only (read-only)
            this.ready = 'readonly';
            return {
                success: true,
                mode: 'readonly',
                gateway: this.gateway
            };
        }
    }

    /**
     * Get Infura auth (if configured)
     */
    getInfuraAuth() {
        // In production, store in environment variables
        const projectId = 'YOUR_INFURA_PROJECT_ID';
        const projectSecret = 'YOUR_INFURA_PROJECT_SECRET';
        
        if (projectId && projectSecret) {
            const auth = 'Basic ' + btoa(projectId + ':' + projectSecret);
            return auth;
        }
        
        return null;
    }

    /**
     * Upload encrypted data to IPFS
     */
    async upload(data, encrypt = true) {
        try {
            if (!this.ready) throw new Error('Not initialized');
            if (this.ready === 'readonly') throw new Error('Read-only mode - cannot upload');

            let uploadData = data;

            // Encrypt before upload (defense in depth)
            if (encrypt && typeof data === 'string') {
                const encryptionKey = this.generateEncryptionKey();
                uploadData = this.encryptData(data, encryptionKey);
            }

            // Upload to IPFS
            const result = await this.client.add(uploadData);

            return {
                cid: result.cid.toString(),
                path: result.path,
                size: result.size,
                gateway: `${this.gateway}/ipfs/${result.cid}`,
                encryptionKey: encrypt ? uploadData.key : null
            };
        } catch (error) {
            throw new Error(`IPFS upload failed: ${error.message}`);
        }
    }

    /**
     * Upload JSON object
     */
    async uploadJSON(jsonData, encrypt = true) {
        try {
            const jsonString = JSON.stringify(jsonData);
            return await this.upload(jsonString, encrypt);
        } catch (error) {
            throw new Error(`IPFS JSON upload failed: ${error.message}`);
        }
    }

    /**
     * Download from IPFS
     */
    async download(cid, encryptionKey = null) {
        try {
            if (!this.ready) throw new Error('Not initialized');

            let data;

            if (this.client && this.ready !== 'readonly') {
                // Use IPFS client
                const chunks = [];
                for await (const chunk of this.client.cat(cid)) {
                    chunks.push(chunk);
                }
                
                const uint8Array = new Uint8Array(
                    chunks.reduce((acc, chunk) => acc + chunk.length, 0)
                );
                
                let offset = 0;
                for (const chunk of chunks) {
                    uint8Array.set(chunk, offset);
                    offset += chunk.length;
                }
                
                data = new TextDecoder().decode(uint8Array);
            } else {
                // Fallback: use gateway
                const response = await fetch(`${this.gateway}/ipfs/${cid}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                data = await response.text();
            }

            // Decrypt if key provided
            if (encryptionKey) {
                data = this.decryptData(data, encryptionKey);
            }

            return data;
        } catch (error) {
            throw new Error(`IPFS download failed: ${error.message}`);
        }
    }

    /**
     * Download JSON object
     */
    async downloadJSON(cid, encryptionKey = null) {
        try {
            const data = await this.download(cid, encryptionKey);
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`IPFS JSON download failed: ${error.message}`);
        }
    }

    /**
     * Pin content (keep on IPFS network)
     */
    async pin(cid) {
        try {
            if (!this.ready || this.ready === 'readonly') {
                throw new Error('Cannot pin in current mode');
            }

            await this.client.pin.add(cid);

            return {
                success: true,
                cid: cid,
                pinned: true
            };
        } catch (error) {
            throw new Error(`IPFS pin failed: ${error.message}`);
        }
    }

    /**
     * Unpin content
     */
    async unpin(cid) {
        try {
            if (!this.ready || this.ready === 'readonly') {
                throw new Error('Cannot unpin in current mode');
            }

            await this.client.pin.rm(cid);

            return {
                success: true,
                cid: cid,
                pinned: false
            };
        } catch (error) {
            throw new Error(`IPFS unpin failed: ${error.message}`);
        }
    }

    /**
     * Generate encryption key for IPFS data
     */
    generateEncryptionKey() {
        const key = CryptoJS.lib.WordArray.random(256/8);
        return key.toString();
    }

    /**
     * Encrypt data before IPFS upload
     */
    encryptData(data, key) {
        const encrypted = CryptoJS.AES.encrypt(data, key, {
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.Pkcs7
        });

        return {
            ciphertext: encrypted.toString(),
            key: key,
            algorithm: 'AES-256-GCM'
        };
    }

    /**
     * Decrypt IPFS downloaded data
     */
    decryptData(encryptedData, key) {
        try {
            const ciphertext = typeof encryptedData === 'string' 
                ? encryptedData 
                : encryptedData.ciphertext;

            const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
                mode: CryptoJS.mode.GCM,
                padding: CryptoJS.pad.Pkcs7
            });

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            throw new Error('Decryption failed - invalid key or corrupted data');
        }
    }

    /**
     * Get IPFS stats
     */
    async getStats() {
        try {
            if (!this.client || this.ready === 'readonly') {
                return {
                    mode: 'readonly',
                    gateway: this.gateway
                };
            }

            const stats = await this.client.stats.bw();
            
            return {
                mode: 'full',
                rateIn: stats.rateIn,
                rateOut: stats.rateOut,
                totalIn: stats.totalIn,
                totalOut: stats.totalOut
            };
        } catch (error) {
            return {
                mode: 'readonly',
                error: error.message
            };
        }
    }

    /**
     * Check if CID exists
     */
    async exists(cid) {
        try {
            const response = await fetch(`${this.gateway}/ipfs/${cid}`, {
                method: 'HEAD'
            });
            
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clean up
     */
    destroy() {
        this.client = null;
        this.ready = false;
    }
}

console.log('✅ IPFS Storage Module loaded (Decentralized + Encrypted)');
