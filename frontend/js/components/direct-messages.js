const DirectMessages = {
    conversations: [],
    
    init() {
        this.loadConversations();
    },
    
    async loadConversations() {
        try {
            // TODO: API call
            // const convs = await API.getDMs();
            
            // Mock data
            this.conversations = [];
            this.render();
            
        } catch (error) {
            console.error('Load DMs error:', error);
        }
    },
    
    render() {
        const container = document.getElementById('dmsSection');
        if (!container) return;
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div style="padding: var(--space-sm); color: rgba(255,255,255,0.5); font-size: var(--font-size-sm); text-align: center;">
                    No direct messages yet
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.conversations.map(dm => `
            <div class="nav-item" onclick="DirectMessages.open(${dm.id})">
                <div class="nav-item-icon">
                    <div class="dm-avatar">${(dm.user?.name || 'U').charAt(0).toUpperCase()}</div>
                </div>
                <span class="nav-item-text">${dm.user?.name || 'User'}</span>
                ${dm.unread_count ? `<span class="nav-item-badge">${dm.unread_count}</span>` : ''}
            </div>
        `).join('');
    },
    
    showNewDM() {
        Modal.prompt({
            title: 'New Direct Message',
            message: 'Enter username or email',
            placeholder: 'john@company.com',
            confirmText: 'Start Chat',
            onConfirm: async (value) => {
                if (!value) return;
                
                try {
                    Toast.info('Starting conversation...');
                    
                    // TODO: API call to start DM
                    // const dm = await API.startDM(value);
                    
                    Toast.success('Conversation started!');
                    
                } catch (error) {
                    Toast.error('User not found');
                }
            }
        });
    },
    
    async open(dmId) {
        try {
            // TODO: Load DM messages
            Toast.info('Opening DM...');
            
            // Update UI to show DM
            STATE.currentChannel = null;
            STATE.currentDM = dmId;
            
            // Load messages
            // await this.loadMessages(dmId);
            
        } catch (error) {
            Toast.error('Failed to open DM');
        }
    },
    
    async sendMessage(dmId, content) {
        try {
            // TODO: API call
            Toast.success('Message sent!');
        } catch (error) {
            Toast.error('Failed to send message');
        }
    }
};

console.log('✅ Direct Messages loaded');
