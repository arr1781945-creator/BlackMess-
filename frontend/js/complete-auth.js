// Complete Authentication Flow Integration

const AuthFlow = {
    // Login
    async login(email, password) {
        try {
            const response = await fetch('http://localhost:8000/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.access) {
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                localStorage.setItem('user', JSON.stringify(data.user));
                return { success: true, data };
            }
            
            throw new Error(data.error || 'Login failed');
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Register
    async register(name, email, password) {
        try {
            const [first_name, ...rest] = name.split(' ');
            
            const response = await fetch('http://localhost:8000/api/auth/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: email.split('@')[0] + Date.now(),
                    email,
                    password,
                    first_name,
                    last_name: rest.join(' ')
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, data };
            }
            
            throw new Error(data.error || 'Registration failed');
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Create Workspace
    async createWorkspace(name, url, description) {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch('http://localhost:8000/api/workspaces/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    slug: url,
                    description
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('workspace', JSON.stringify(data));
                return { success: true, data };
            }
            
            throw new Error(data.error || 'Workspace creation failed');
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Email Verification (mock for now - backend needs endpoint)
    async verifyEmail(code) {
        // TODO: Real API when backend ready
        return new Promise((resolve) => {
            setTimeout(() => {
                if (code.length === 6) {
                    localStorage.setItem('email_verified', 'true');
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: 'Invalid code' });
                }
            }, 1000);
        });
    },
    
    // KYC Submission (mock for now - backend needs endpoint)
    async submitKYC(data) {
        // TODO: Real API when backend ready
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.setItem('kyc_submitted', 'true');
                localStorage.setItem('kyc_data', JSON.stringify(data));
                resolve({ success: true });
            }, 1000);
        });
    },
    
    // Security Setup (mock for now - backend needs endpoint)
    async setupSecurity(data) {
        // TODO: Real API when backend ready
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.setItem('security_setup', 'true');
                localStorage.setItem('setup_complete', 'true');
                resolve({ success: true });
            }, 1000);
        });
    }
};

console.log('✅ Complete Auth Flow loaded');
