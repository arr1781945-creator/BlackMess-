const API = {
    async request(url, options = {}) {
        const token = Storage.get('access_token');
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
                ...options,
                headers
            });
            
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${Storage.get('access_token')}`;
                    const retryResponse = await fetch(`${CONFIG.API_BASE_URL}${url}`, {
                        ...options,
                        headers
                    });
                    return this.handleResponse(retryResponse);
                } else {
                    throw new Error('Session expired. Please login again.');
                }
            }
            
            if (response.status === 404) {
                // Return empty for 404
                return { results: [] };
            }
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API Error:', error);
            // Don't throw on network errors, return empty
            return { results: [] };
        }
    },
    
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.detail || `HTTP ${response.status}`);
        }
        
        return data;
    },
    
    async refreshToken() {
        const refresh = Storage.get('refresh_token');
        if (!refresh) return false;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });
            
            const data = await response.json();
            if (data.access) {
                Storage.set('access_token', data.access);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    },
    
    // Auth
    async login(email, password) {
        const data = await this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.access) {
            Storage.set('access_token', data.access);
            Storage.set('refresh_token', data.refresh);
            Storage.set('user', data.user);
            STATE.user = data.user;
        }
        
        return data;
    },
    
    async register(name, email, password) {
        const [first_name, ...last] = name.split(' ');
        
        return this.request('/auth/register/', {
            method: 'POST',
            body: JSON.stringify({
                username: email.split('@')[0],
                email,
                password,
                first_name,
                last_name: last.join(' ')
            })
        });
    },
    
    logout() {
        Storage.clear();
        STATE.user = null;
        STATE.workspace = null;
        window.location.reload();
    },
    
    // Workspaces
    async getWorkspaces() {
        return this.request('/workspaces/');
    },
    
    async createWorkspace(name, description) {
        return this.request('/workspaces/', {
            method: 'POST',
            body: JSON.stringify({
                name,
                description,
                slug: name.toLowerCase().replace(/\s+/g, '-')
            })
        });
    },
    
    async getWorkspace(id) {
        return this.request(`/workspaces/${id}/`);
    },
    
    // Channels
    async getChannels(workspaceId) {
        return this.request(`/channels/?workspace=${workspaceId}`);
    },
    
    async createChannel(workspaceId, name, description) {
        return this.request('/channels/', {
            method: 'POST',
            body: JSON.stringify({
                workspace: workspaceId,
                name: name.toLowerCase().replace(/\s+/g, '-'),
                description,
                is_private: false
            })
        });
    },
    
    async joinChannel(channelId) {
        return this.request(`/channels/${channelId}/join/`, {
            method: 'POST'
        });
    },
    
    // Messages
    async getMessages(channelId, page = 1) {
        return this.request(`/messages/?channel=${channelId}&page=${page}&limit=${CONFIG.MESSAGE_PAGE_SIZE}`);
    },
    
    async sendMessage(channelId, content) {
        return this.request('/messages/', {
            method: 'POST',
            body: JSON.stringify({
                channel: channelId,
                content
            })
        });
    },
    
    async uploadFile(file, channelId) {
        const token = Storage.get('access_token');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('channel', channelId);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/files/upload/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        return response.json();
    }
};

console.log('✅ API loaded (404 fix)');
