// Auth Views Management
function showView(viewName) {
    document.querySelectorAll('.auth-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
}

// Login Form Handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        Toast.error('Please fill in all fields');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    
    try {
        const data = await API.login(email, password);
        
        if (data.access) {
            Toast.success('Login successful!');
            
            // Always show workspace creation for new setup
            // In production, check if user has workspaces
            try {
                const workspaces = await API.getWorkspaces();
                
                if (workspaces && workspaces.results && workspaces.results.length > 0) {
                    // Has workspace, go to app
                    StorageManager.setWorkspace(workspaces.results[0]);
                    await initApp();
                } else {
                    // No workspace, create one
                    showView('workspace');
                    document.getElementById('loading').classList.add('hidden');
                    document.getElementById('authContainer').classList.remove('hidden');
                }
            } catch (error) {
                // API error, show workspace creation
                console.log('No workspaces found, showing create workspace');
                showView('workspace');
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('authContainer').classList.remove('hidden');
            }
        }
    } catch (error) {
        Toast.error(error.message || 'Login failed');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});

// Register Form Handler
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    if (!name || !email || !password) {
        Toast.error('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        Toast.error('Password must be at least 6 characters');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
        await API.register(name, email, password);
        
        Toast.success('Account created! Please sign in.');
        showView('login');
        
        document.getElementById('loginEmail').value = email;
        
    } catch (error) {
        Toast.error(error.message || 'Registration failed');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// Workspace Form Handler
document.getElementById('workspaceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('workspaceName').value.trim();
    const description = document.getElementById('workspaceDesc').value.trim();
    
    if (!name) {
        Toast.error('Please enter a workspace name');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    try {
        const workspace = await API.createWorkspace(name, description);
        
        StorageManager.setWorkspace(workspace);
        Toast.success('Workspace created!');
        
        await initApp();
        
    } catch (error) {
        Toast.error(error.message || 'Failed to create workspace');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Workspace';
    }
});

// Auto-login check
async function checkAuth() {
    const user = StorageManager.getUser();
    const workspace = StorageManager.getWorkspace();
    
    if (user && workspace) {
        // User + workspace exist, go to app
        await initApp();
    } else if (user) {
        // User exists but no workspace
        showView('workspace');
        hideLoading();
    } else {
        // Not logged in
        showView('login');
        hideLoading();
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    const authContainer = document.getElementById('authContainer');
    
    if (loading) loading.classList.add('hidden');
    if (authContainer) authContainer.classList.remove('hidden');
}

console.log('✅ Auth loaded');
