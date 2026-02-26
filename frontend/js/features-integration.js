// Search, Settings, Profile Integration

const Features = {
    // Search
    async search(query) {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch(`http://localhost:8000/api/search/?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            return { success: true, data };
            
        } catch (error) {
            // Fallback to mock search if endpoint not ready
            return this.mockSearch(query);
        }
    },
    
    mockSearch(query) {
        // Mock search results
        return {
            success: true,
            data: {
                messages: [],
                channels: [],
                users: []
            }
        };
    },
    
    // Settings
    loadSettings() {
        const settings = localStorage.getItem('user_settings');
        return settings ? JSON.parse(settings) : this.defaultSettings();
    },
    
    saveSettings(settings) {
        localStorage.setItem('user_settings', JSON.stringify(settings));
        return { success: true };
    },
    
    defaultSettings() {
        return {
            theme: 'light',
            notifications: {
                desktop: true,
                sound: true,
                email: false
            },
            privacy: {
                readReceipts: true,
                typing: true,
                lastSeen: true
            }
        };
    },
    
    // Profile
    async updateProfile(data) {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch('http://localhost:8000/api/profile/', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Update local storage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                Object.assign(user, result);
                localStorage.setItem('user', JSON.stringify(user));
                return { success: true, data: result };
            }
            
            throw new Error(result.error || 'Update failed');
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    async uploadAvatar(file) {
        try {
            const token = localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('avatar', file);
            
            const response = await fetch('http://localhost:8000/api/profile/avatar/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await response.json();
            return { success: true, data };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

console.log('✅ Features Integration loaded');
