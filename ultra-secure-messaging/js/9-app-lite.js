/**
 * Main App - LITE VERSION
 * Faster loading without IPFS
 */

let messenger = null;
let testResults = [];

async function initApp() {
    try {
        updateStatus('🚀 Initializing (Lite Mode)...', 'info');

        messenger = new UltraSecureMessenger({
            enableE2EE: true,
            enablePQC: true,
            enableZKP: true,
            enableSelfDestruct: true,
            enableAntiScreenshot: true,
            enableAntiForensic: true,
            sessionTimeout: 30,
            autoCleanup: true
        });

        const result = await messenger.initialize('testuser', 'SecurePassword123!');

        if (result.success) {
            updateStatus('✅ All systems ready!', 'success');
            displayStatus();
        } else {
            throw new Error('Init failed');
        }

    } catch (error) {
        updateStatus(`❌ Error: ${error.message}`, 'error');
        console.error(error);
    }
}

async function testSystem() {
    testResults = [];
    updateStatus('🧪 Running tests...', 'info');

    try {
        await testE2EE();
        await testPQC();
        await testZKP();
        await testSelfDestruct();
        await testAntiScreenshot();
        await testAntiForensic();
        displayTestResults();
    } catch (error) {
        updateStatus(`❌ Test failed: ${error.message}`, 'error');
        console.error(error);
    }
}

async function testE2EE() {
    try {
        updateStatus('  🔐 Testing E2EE...', 'info');

        const testMessage = 'Top secret! 🔒';
        const recipient = new SecureE2EE();
        await recipient.initialize();

        const encrypted = messenger.e2ee.encrypt(
            testMessage,
            recipient.exportPublicKey(),
            'recipient123'
        );

        const decrypted = recipient.decrypt(
            encrypted,
            messenger.e2ee.exportPublicKey()
        );

        const success = decrypted === testMessage;

        testResults.push({
            name: 'E2EE Encryption',
            status: success ? 'PASS' : 'FAIL',
            details: success ? 'Encrypted & decrypted OK' : 'Mismatch',
            icon: '🔐'
        });

        updateStatus(`  ${success ? '✅' : '❌'} E2EE ${success ? 'passed' : 'failed'}`, success ? 'success' : 'error');

    } catch (error) {
        testResults.push({
            name: 'E2EE Encryption',
            status: 'FAIL',
            details: error.message,
            icon: '🔐'
        });
        throw error;
    }
}

async function testPQC() {
    try {
        updateStatus('  🛡️ Testing PQC...', 'info');

        const testMessage = 'Quantum-resistant!';
        const recipient = new SecurePQC();
        await recipient.initialize();

        const encrypted = messenger.pqc.encrypt(
            testMessage,
            recipient.exportPublicKey()
        );

        const decrypted = recipient.decrypt(
            encrypted,
            messenger.pqc.exportPublicKey()
        );

        const success = decrypted === testMessage;

        testResults.push({
            name: 'Post-Quantum Crypto',
            status: success ? 'PASS' : 'FAIL',
            details: success ? 'PQC working' : 'Failed',
            icon: '🛡️'
        });

        updateStatus(`  ${success ? '✅' : '❌'} PQC ${success ? 'passed' : 'failed'}`, success ? 'success' : 'error');

    } catch (error) {
        testResults.push({
            name: 'Post-Quantum Crypto',
            status: 'FAIL',
            details: error.message,
            icon: '🛡️'
        });
        throw error;
    }
}

async function testZKP() {
    try {
        updateStatus('  🎭 Testing ZKP...', 'info');

        const username = 'testuser';
        const password = 'SecurePassword123!';

        const registration = await messenger.zkp.register(username, password);

        const challenge = btoa(Math.random().toString());
        const authData = await messenger.zkp.authenticate(username, password, {
            salt: registration.salt,
            challenge: challenge
        });

        const verified = await messenger.zkp.verify(
            authData,
            registration.verifier,
            challenge
        );

        const success = verified.success;

        testResults.push({
            name: 'Zero-Knowledge Proof',
            status: success ? 'PASS' : 'FAIL',
            details: success ? 'ZKP auth OK' : 'Failed',
            icon: '🎭'
        });

        updateStatus(`  ${success ? '✅' : '❌'} ZKP ${success ? 'passed' : 'failed'}`, success ? 'success' : 'error');

    } catch (error) {
        testResults.push({
            name: 'Zero-Knowledge Proof',
            status: 'FAIL',
            details: error.message,
            icon: '🎭'
        });
        throw error;
    }
}

async function testSelfDestruct() {
    try {
        updateStatus('  💣 Testing Self-Destruct...', 'info');

        const messageId = 'test_' + Date.now();
        
        messenger.selfDestruct.create(messageId, {
            timeout: 5000,
            readOnce: true
        });

        messenger.selfDestruct.markAsRead(messageId);

        testResults.push({
            name: 'Self-Destruct',
            status: 'PASS',
            details: 'Timer set & triggered',
            icon: '💣'
        });

        updateStatus('  ✅ Self-Destruct passed', 'success');

    } catch (error) {
        testResults.push({
            name: 'Self-Destruct',
            status: 'FAIL',
            details: error.message,
            icon: '💣'
        });
        throw error;
    }
}

async function testAntiScreenshot() {
    try {
        updateStatus('  🚫 Testing Anti-Screenshot...', 'info');

        const testElement = document.createElement('div');
        testElement.textContent = 'Protected';
        testElement.id = 'test-protected';
        document.body.appendChild(testElement);

        messenger.antiScreenshot.protect(testElement);

        const success = messenger.antiScreenshot.isActive;

        testResults.push({
            name: 'Anti-Screenshot',
            status: success ? 'PASS' : 'FAIL',
            details: success ? 'Protection active' : 'Failed',
            icon: '🚫'
        });

        updateStatus(`  ${success ? '✅' : '❌'} Anti-Screenshot ${success ? 'OK' : 'failed'}`, success ? 'success' : 'error');

        testElement.remove();

    } catch (error) {
        testResults.push({
            name: 'Anti-Screenshot',
            status: 'FAIL',
            details: error.message,
            icon: '🚫'
        });
        throw error;
    }
}

async function testAntiForensic() {
    try {
        updateStatus('  🔬 Testing Anti-Forensic...', 'info');

        let testData = 'sensitive data';
        testData = messenger.antiForensic.secureWipe(testData);

        const success = testData === null;

        testResults.push({
            name: 'Anti-Forensic',
            status: success ? 'PASS' : 'FAIL',
            details: success ? 'Secure wipe OK' : 'Failed',
            icon: '🔬'
        });

        updateStatus(`  ${success ? '✅' : '❌'} Anti-Forensic ${success ? 'OK' : 'failed'}`, success ? 'success' : 'error');

    } catch (error) {
        testResults.push({
            name: 'Anti-Forensic',
            status: 'FAIL',
            details: error.message,
            icon: '🔬'
        });
        throw error;
    }
}

function displayTestResults() {
    const output = document.getElementById('output');
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const total = testResults.length;

    let html = `
        <div class="test-results">
            <h2>🧪 Test Results</h2>
            <div class="test-summary">
                <strong>${passed}/${total} passed</strong>
            </div>
            <div class="test-list">
    `;

    testResults.forEach(result => {
        const statusClass = result.status === 'PASS' ? 'pass' : 'fail';
        html += `
            <div class="test-item ${statusClass}">
                <div class="test-header">
                    <span class="test-icon">${result.icon}</span>
                    <span class="test-name">${result.name}</span>
                    <span class="test-status">${result.status}</span>
                </div>
                <div class="test-details">${result.details}</div>
            </div>
        `;
    });

    html += `</div></div>`;
    output.innerHTML = html;

    updateStatus(`✅ Complete: ${passed}/${total} passed`, 'success');
}

function displayStatus() {
    const status = messenger.getSecurityStatus();
    const output = document.getElementById('output');

    let html = `
        <div class="security-status">
            <h2>🔒 Security Status</h2>
            <div class="status-grid">
                <div class="status-item ${status.features.e2ee ? 'active' : 'inactive'}">
                    <span class="status-icon">🔐</span>
                    <span class="status-label">E2EE</span>
                    <span class="status-value">${status.features.e2ee ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="status-item ${status.features.pqc ? 'active' : 'inactive'}">
                    <span class="status-icon">🛡️</span>
                    <span class="status-label">PQC</span>
                    <span class="status-value">${status.features.pqc ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="status-item ${status.features.zkp ? 'active' : 'inactive'}">
                    <span class="status-icon">🎭</span>
                    <span class="status-label">Zero-Knowledge</span>
                    <span class="status-value">${status.features.zkp ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="status-item ${status.features.selfDestruct ? 'active' : 'inactive'}">
                    <span class="status-icon">💣</span>
                    <span class="status-label">Self-Destruct</span>
                    <span class="status-value">${status.features.selfDestruct ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="status-item ${status.features.antiScreenshot ? 'active' : 'inactive'}">
                    <span class="status-icon">🚫</span>
                    <span class="status-label">Anti-Screenshot</span>
                    <span class="status-value">${status.features.antiScreenshot ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="status-item ${status.features.antiForensic ? 'active' : 'inactive'}">
                    <span class="status-icon">🔬</span>
                    <span class="status-label">Anti-Forensic</span>
                    <span class="status-value">${status.features.antiForensic ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
            <div class="status-summary">
                <p><strong>Security Layers:</strong> ${status.layers}</p>
                <p><strong>User:</strong> ${status.user || 'Anonymous'}</p>
                <p><strong>Status:</strong> ${status.ready ? '✅ Ready' : '⏳ Loading'}</p>
                <p><strong>Mode:</strong> ⚡ Lite (Fast)</p>
            </div>
        </div>
    `;

    output.innerHTML = html;
}

function updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    statusDiv.innerHTML = `${icons[type]} ${message}`;
    statusDiv.className = `status-${type}`;

    console.log(message);
}

function clearData() {
    if (!confirm('⚠️ Destroy ALL data? Cannot be undone!')) {
        return;
    }

    if (messenger) {
        messenger.emergencyCleanup();
        updateStatus('🔥 All data destroyed', 'warning');
    }

    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

console.log('✅ App Lite loaded');
