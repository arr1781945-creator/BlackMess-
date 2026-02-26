// Already included in config.js as Storage object
// This file exists for modularity

const StorageManager = {
    // Token management
    getToken() {
        return Storage.get('access_token');
    },
    
    setToken(token) {
        Storage.set('access_token', token);
    },
    
    getRefreshToken() {
        return Storage.get('refresh_token');
    },
    
    // User management
    getUser() {
        const user = Storage.get('user');
        if (user) STATE.user = user;
        return user;
    },
    
    setUser(user) {
        Storage.set('user', user);
        STATE.user = user;
    },
    
    // Workspace management
    getWorkspace() {
        const workspace = Storage.get('workspace');
        if (workspace) STATE.workspace = workspace;
        return workspace;
    },
    
    setWorkspace(workspace) {
        Storage.set('workspace', workspace);
        STATE.workspace = workspace;
    },
    
    // Settings
    getSettings() {
        return Storage.get('settings') || {
            theme: 'light',
            notifications: true,
            sounds: true
        };
    },
    
    setSettings(settings) {
        Storage.set('settings', settings);
    },
    
    // Clear all
    clearAll() {
        Storage.clear();
        STATE.user = null;
        STATE.workspace = null;
        STATE.channels = [];
        STATE.messages.clear();
    }
};

console.log('✅ Storage loaded');
