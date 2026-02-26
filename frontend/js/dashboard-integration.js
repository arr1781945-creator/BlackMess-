// Dashboard API Integration

const DashboardAPI = {
    // Load Channels
    async getChannels() {
        try {
            const token = localStorage.getItem('access_token');
            const workspace = JSON.parse(localStorage.getItem('workspace') || '{}');
            
            const response = await fetch(`http://localhost:8000/api/channels/?workspace=${workspace.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            return { success: true, data: data.results || [] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Create Channel
    async createChannel(name, description) {
        try {
            const token = localStorage.getItem('access_token');
            const workspace = JSON.parse(localStorage.getItem('workspace') || '{}');
            
            const response = await fetch('http://localhost:8000/api/channels/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    workspace: workspace.id,
                    name: name.toLowerCase().replace(/\s+/g, '-'),
                    description,
                    is_private: false
                })
            });
            
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Load Messages
    async getMessages(channelId) {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch(`http://localhost:8000/api/messages/?channel=${channelId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            return { success: true, data: data.results || [] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Send Message
    async sendMessage(channelId, content) {
        try {
            const token = localStorage.getItem('access_token');
            
            const response = await fetch('http://localhost:8000/api/messages/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    channel: channelId,
                    content
                })
            });
            
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

console.log('✅ Dashboard API loaded');
