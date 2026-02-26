const WebSocketManager = {
    ws: null,
    reconnectInterval: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    
    connect(channelId) {
        this.disconnect();
        
        const token = Storage.get('access_token');
        const wsUrl = `${CONFIG.WS_BASE_URL}/chat/${channelId}/?token=${token}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                STATE.isConnected = true;
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
            
            this.ws.onclose = () => {
                console.log('❌ WebSocket disconnected');
                STATE.isConnected = false;
                this.updateConnectionStatus(false);
                this.scheduleReconnect(channelId);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect(channelId);
        }
    },
    
    disconnect() {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    },
    
    scheduleReconnect(channelId) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            Toast.error('Connection lost. Please refresh the page.');
            return;
        }
        
        this.reconnectInterval = setTimeout(() => {
            console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts + 1})`);
            this.reconnectAttempts++;
            this.connect(channelId);
        }, 3000 * Math.pow(2, this.reconnectAttempts));
    },
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected');
        }
    },
    
    handleMessage(data) {
        console.log('📨 WebSocket message:', data);
        
        switch (data.type) {
            case 'message':
                this.handleNewMessage(data.message);
                break;
            case 'typing':
                this.handleTyping(data);
                break;
            case 'user_status':
                this.handleUserStatus(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    },
    
    handleNewMessage(message) {
        if (!STATE.currentChannel) return;
        
        const channelMessages = STATE.messages.get(STATE.currentChannel.id) || [];
        
        // Check if message already exists
        if (channelMessages.find(m => m.id === message.id)) {
            return;
        }
        
        channelMessages.push(message);
        STATE.messages.set(STATE.currentChannel.id, channelMessages);
        
        // Add to UI
        if (window.renderMessage) {
            window.renderMessage(message);
        }
    },
    
    handleTyping(data) {
        // TODO: Show typing indicator
        console.log(`${data.user} is typing...`);
    },
    
    handleUserStatus(data) {
        // TODO: Update user status
        console.log(`${data.user} is ${data.status}`);
    },
    
    sendTyping() {
        this.send({
            type: 'typing',
            user: STATE.user?.username
        });
    },
    
    updateConnectionStatus(connected) {
        // TODO: Update UI connection indicator
        const indicator = document.querySelector('.connection-indicator');
        if (indicator) {
            indicator.classList.toggle('connected', connected);
            indicator.classList.toggle('disconnected', !connected);
        }
    }
};

console.log('✅ WebSocket loaded');
