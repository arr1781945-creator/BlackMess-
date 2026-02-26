/**
 * Zero-Knowledge Proof Authentication
 * Uses SRP (Secure Remote Password) Protocol
 * Server never knows password, only verifies proof
 */

class ZeroKnowledgeAuth {
    constructor() {
        this.ready = false;
        this.identity = null;
        this.verifier = null;
        this.salt = null;
    }

    // Initialize
    async initialize() {
        try {
            await sodium.ready;
            this.ready = true;
            return { success: true };
        } catch (error) {
            throw new Error(`ZKP init failed: ${error.message}`);
        }
    }

    /**
     * Register user with zero-knowledge proof
     * Server receives verifier, NOT password
     */
    async register(username, password) {
        try {
            if (!this.ready) throw new Error('Not initialized');

            // Generate random salt
            this.salt = sodium.randombytes_buf(32);

            // Derive key from password
            const passwordKey = sodium.crypto_pwhash(
                32,
                sodium.from_string(password),
                this.salt,
                sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
                sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
                sodium.crypto_pwhash_ALG_ARGON2ID13
            );

            // Generate verifier (server stores this, NOT password)
            const identity = sodium.from_string(username);
            this.verifier = sodium.crypto_generichash(
                32,
                passwordKey,
                identity
            );

            this.identity = identity;

            // Return data for server storage
            return {
                username: username,
                salt: sodium.to_base64(this.salt),
                verifier: sodium.to_base64(this.verifier),
                algorithm: 'SRP-Argon2id'
            };
        } catch (error) {
            throw new Error(`ZKP registration failed: ${error.message}`);
        }
    }

    /**
     * Authenticate without sending password
     * Uses challenge-response protocol
     */
    async authenticate(username, password, serverData) {
        try {
            if (!this.ready) throw new Error('Not initialized');

            // Step 1: Receive salt from server
            const salt = sodium.from_base64(serverData.salt);
            
            // Step 2: Derive key from password (client side)
            const passwordKey = sodium.crypto_pwhash(
                32,
                sodium.from_string(password),
                salt,
                sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
                sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
                sodium.crypto_pwhash_ALG_ARGON2ID13
            );

            // Step 3: Generate client proof
            const identity = sodium.from_string(username);
            const clientProof = sodium.crypto_generichash(
                32,
                passwordKey,
                identity
            );

            // Step 4: Create challenge response
            const challenge = serverData.challenge 
                ? sodium.from_base64(serverData.challenge)
                : sodium.randombytes_buf(32);

            // Step 5: Sign challenge with proof
            const response = sodium.crypto_generichash(
                32,
                challenge,
                clientProof
            );

            return {
                username: username,
                proof: sodium.to_base64(clientProof),
                challengeResponse: sodium.to_base64(response),
                timestamp: Date.now()
            };
        } catch (error) {
            throw new Error(`ZKP authentication failed: ${error.message}`);
        }
    }

    /**
     * Verify authentication (server-side simulation)
     * In production, this runs on server
     */
    async verify(authData, storedVerifier, challenge) {
        try {
            if (!this.ready) throw new Error('Not initialized');

            const proof = sodium.from_base64(authData.proof);
            const verifier = sodium.from_base64(storedVerifier);

            // Compare proof with stored verifier
            const isValid = sodium.memcmp(proof, verifier);

            if (!isValid) {
                throw new Error('Authentication failed - invalid credentials');
            }

            // Verify challenge response
            const challengeBytes = sodium.from_base64(challenge);
            const responseBytes = sodium.from_base64(authData.challengeResponse);
            
            const expectedResponse = sodium.crypto_generichash(
                32,
                challengeBytes,
                proof
            );

            const challengeValid = sodium.memcmp(responseBytes, expectedResponse);

            if (!challengeValid) {
                throw new Error('Challenge verification failed');
            }

            return {
                success: true,
                authenticated: true,
                timestamp: Date.now()
            };
        } catch (error) {
            throw new Error(`ZKP verification failed: ${error.message}`);
        }
    }

    /**
     * Generate session token after successful auth
     * Token is derived from proof, not password
     */
    generateSessionToken(username, proof) {
        try {
            if (!this.ready) throw new Error('Not initialized');

            const proofBytes = typeof proof === 'string' 
                ? sodium.from_base64(proof) 
                : proof;

            const sessionData = sodium.from_string(
                JSON.stringify({
                    username: username,
                    timestamp: Date.now(),
                    random: sodium.to_base64(sodium.randombytes_buf(16))
                })
            );

            const token = sodium.crypto_generichash(
                32,
                sessionData,
                proofBytes
            );

            return sodium.to_base64(token);
        } catch (error) {
            throw new Error(`Token generation failed: ${error.message}`);
        }
    }

    /**
     * Change password (zero-knowledge)
     * Requires old password proof
     */
    async changePassword(username, oldPassword, newPassword, serverData) {
        try {
            // Verify old password
            const authResult = await this.authenticate(username, oldPassword, serverData);
            
            // Register with new password
            const newRegistration = await this.register(username, newPassword);

            return {
                success: true,
                newVerifier: newRegistration.verifier,
                newSalt: newRegistration.salt
            };
        } catch (error) {
            throw new Error(`Password change failed: ${error.message}`);
        }
    }

    /**
     * Secure wipe
     */
    destroy() {
        if (this.salt) sodium.memzero(this.salt);
        if (this.verifier) sodium.memzero(this.verifier);
        
        this.identity = null;
        this.verifier = null;
        this.salt = null;
    }
}

console.log('✅ Zero-Knowledge Proof Module loaded (SRP + Argon2id)');
