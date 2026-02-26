// WebSocket Real-Time Integration

const WSManager = {
    ws: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    
    connect(channelId) {
        const token = localStorage.getItem('access_token');
        
        if (!token || !channelId) {
            console.error('Missing token or channelId');
            return;
        }
        
        // Close existing connection
        if (this.ws) {
            this.ws.close();
        }
        
        // WebSocket URL
        const wsUrl = `ws://localhost:8000/ws/chat/${channelId}/?token=${token}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket closed');
                this.updateConnectionStatus(false);
                this.attemptReconnect(channelId);
            };
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
        }
    },
    
    handleMessage(data) {
        switch(data.type) {
            case 'message':
                this.onNewMessage(data.message);
                break;
            case 'typing':
                this.onTyping(data.user);
                break;
            case 'user_status':
                this.onUserStatus(data.user, data.status);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    },
    
    onNewMessage(message) {
        // Add message to UI
        if (window.addMessageToUI) {
            window.addMessageToUI(message);
        }
    },
    
    onTyping(user) {
        // Show typing indicator
        console.log(`${user.name} is typing...`);
    },
    
    onUserStatus(user, status) {
        // Update user status
        console.log(`${user.name} is ${status}`);
    },
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket not connected');
        }
    },
    
    sendMessage(content) {
        this.send({
            type: 'message',
            content: content
        });
    },
    
    sendTyping() {
        this.send({
            type: 'typing'
        });
    },
    
    attemptReconnect(channelId) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
            
            setTimeout(() => {
                this.connect(channelId);
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
        }
    },
    
    updateConnectionStatus(connected) {
        // Update UI connection indicator
        const indicator = document.getElementById('connectionStatus');
        if (indicator) {
            indicator.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
        }
    },
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
};

console.log('✅ WebSocket Manager loaded');
