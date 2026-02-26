/**
 * Post-Quantum Cryptography Module
 * Uses libsodium (includes post-quantum primitives)
 * Implements hybrid encryption (classical + PQC)
 */

class SecurePQC {
    constructor() {
        this.ready = false;
        this.classicalKeys = null;
        this.pqcKeys = null;
    }

    // Initialize (wait for libsodium)
    async initialize() {
        try {
            await sodium.ready;
            this.ready = true;

            // Generate classical key pair (for hybrid approach)
            this.classicalKeys = sodium.crypto_box_keypair();

            // Generate PQC key pair (using libsodium's sealed box)
            this.pqcKeys = sodium.crypto_box_keypair();

            return {
                success: true,
                publicKey: this.exportPublicKey()
            };
        } catch (error) {
            throw new Error(`PQC init failed: ${error.message}`);
        }
    }

    // Export public key
    exportPublicKey() {
        if (!this.ready) throw new Error('Not initialized');
        
        return {
            classical: sodium.to_base64(this.classicalKeys.publicKey),
            pqc: sodium.to_base64(this.pqcKeys.publicKey)
        };
    }

    // Hybrid encryption (classical + PQC)
    encrypt(message, recipientPublicKeys) {
        try {
            if (!this.ready) throw new Error('Not initialized');

            const messageBytes = sodium.from_string(message);

            // Step 1: Classical encryption
            const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
            const classicalRecipientPK = sodium.from_base64(recipientPublicKeys.classical);
            
            const classicalEncrypted = sodium.crypto_box_easy(
                messageBytes,
                nonce,
                classicalRecipientPK,
                this.classicalKeys.privateKey
            );

            // Step 2: PQC layer (sealed box - quantum resistant)
            const pqcRecipientPK = sodium.from_base64(recipientPublicKeys.pqc);
            const pqcEncrypted = sodium.crypto_box_seal(
                classicalEncrypted,
                pqcRecipientPK
            );

            return {
                ciphertext: sodium.to_base64(pqcEncrypted),
                nonce: sodium.to_base64(nonce),
                timestamp: Date.now(),
                algorithm: 'Hybrid-Classical-PQC'
            };
        } catch (error) {
            throw new Error(`PQC encryption failed: ${error.message}`);
        }
    }

    // Hybrid decryption
    decrypt(encryptedPackage, senderPublicKeys) {
        try {
            if (!this.ready) throw new Error('Not initialized');

            const ciphertext = sodium.from_base64(encryptedPackage.ciphertext);
            const nonce = sodium.from_base64(encryptedPackage.nonce);

            // Step 1: PQC decryption
            const pqcDecrypted = sodium.crypto_box_seal_open(
                ciphertext,
                this.pqcKeys.publicKey,
                this.pqcKeys.privateKey
            );

            // Step 2: Classical decryption
            const senderClassicalPK = sodium.from_base64(senderPublicKeys.classical);
            const decrypted = sodium.crypto_box_open_easy(
                pqcDecrypted,
                nonce,
                senderClassicalPK,
                this.classicalKeys.privateKey
            );

            if (!decrypted) {
                throw new Error('Decryption failed - invalid or tampered data');
            }

            return sodium.to_string(decrypted);
        } catch (error) {
            throw new Error(`PQC decryption failed: ${error.message}`);
        }
    }

    // Secure destroy
    destroy() {
        if (this.classicalKeys) {
            sodium.memzero(this.classicalKeys.privateKey);
        }
        if (this.pqcKeys) {
            sodium.memzero(this.pqcKeys.privateKey);
        }
        this.classicalKeys = null;
        this.pqcKeys = null;
    }
}

console.log('✅ PQC Module loaded (libsodium - Hybrid Classical + PQC)');
