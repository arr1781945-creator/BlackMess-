// Main App Initialization
async function initApp() {
    try {
        const user = StorageManager.getUser();
        const workspace = StorageManager.getWorkspace();
        
        if (!user || !workspace) {
            showView('login');
            hideLoading();
            return;
        }
        
        // Update UI
        updateUserInfo(user);
        updateWorkspaceInfo(workspace);
        
        // Load channels
        await loadChannels(workspace.id);
        
        // Show app
        document.getElementById('loading')?.classList.add('hidden');
        document.getElementById('authContainer')?.classList.add('hidden');
        document.getElementById('appContainer')?.classList.remove('hidden');
        
        Toast.success(`Welcome back, ${user.first_name || user.username}!`);
        
    } catch (error) {
        console.error('Init app error:', error);
        Toast.error('Failed to load app');
        API.logout();
    }
}

function updateUserInfo(user) {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
        userName.textContent = user.first_name || user.username;
    }
    
    if (userAvatar) {
        userAvatar.textContent = (user.first_name || user.username).charAt(0).toUpperCase();
    }
}

function updateWorkspaceInfo(workspace) {
    const workspaceName = document.getElementById('workspaceName');
    
    if (workspaceName) {
        workspaceName.textContent = workspace.name;
    }
}

// Channel Management
async function loadChannels(workspaceId) {
    try {
        const channels = await API.getChannels(workspaceId);
        STATE.channels = channels || [];
        
        renderChannels(channels);
        
        // Auto-select first channel
        if (channels && channels.length > 0) {
            await selectChannel(channels[0]);
        } else {
            // Create default channel
            const defaultChannel = await API.createChannel(workspaceId, 'general', 'General discussion');
            await loadChannels(workspaceId);
        }
        
    } catch (error) {
        console.error('Load channels error:', error);
        Toast.error('Failed to load channels');
    }
}

function renderChannels(channels) {
    const container = document.getElementById('channelsSection');
    if (!container) return;
    
    if (!channels || channels.length === 0) {
        container.innerHTML = '<div style="padding: var(--space-sm); color: rgba(255,255,255,0.5); font-size: var(--font-size-sm);">No channels yet</div>';
        return;
    }
    
    container.innerHTML = channels.map(channel => `
        <div class="nav-item" data-channel-id="${channel.id}" onclick="selectChannelById(${channel.id})">
            <svg class="nav-item-icon" width="16" height="16" viewBox="0 0 16 16">
                <path d="M5 2v12M11 2v12M2 5h12M2 11h12" stroke="currentColor" fill="none"/>
            </svg>
            <span class="nav-item-text">${channel.name}</span>
            ${channel.unread_count ? `<span class="nav-item-badge">${channel.unread_count}</span>` : ''}
        </div>
    `).join('');
}

async function selectChannelById(channelId) {
    const channel = STATE.channels.find(c => c.id === channelId);
    if (channel) {
        await selectChannel(channel);
    }
}

async function selectChannel(channel) {
    STATE.currentChannel = channel;
    
    // Update UI
    const channelNameEl = document.getElementById('channelName');
    if (channelNameEl) {
        channelNameEl.textContent = `# ${channel.name}`;
    }
    
    // Update active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-channel-id="${channel.id}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Load messages
    await loadMessages(channel.id);
    
    // Connect WebSocket
    WebSocketManager.connect(channel.id);
}

// Message Management
async function loadMessages(channelId) {
    try {
        const result = await API.getMessages(channelId);
        const messages = result.results || [];
        
        STATE.messages.set(channelId, messages);
        renderMessages(messages);
        
    } catch (error) {
        console.error('Load messages error:', error);
        Toast.error('Failed to load messages');
    }
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-xl); color: var(--text-secondary);">
                <p>No messages yet. Start the conversation!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => createMessageHTML(msg)).join('');
    
    // Scroll to bottom
    const messagesArea = document.getElementById('messagesArea');
    if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
}

function createMessageHTML(message) {
    const user = message.user || {};
    const avatar = (user.first_name || user.username || 'U').charAt(0).toUpperCase();
    
    return `
        <div class="message" data-message-id="${message.id}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${user.first_name || user.username || 'User'}</span>
                    <span class="message-time">${Utils.formatTime(message.created_at)}</span>
                </div>
                <div class="message-text">${Utils.escapeHtml(message.content)}</div>
            </div>
        </div>
    `;
}

// Render single message (for WebSocket)
window.renderMessage = function(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    
    // Remove "no messages" placeholder
    const placeholder = container.querySelector('[style*="text-align: center"]');
    if (placeholder) {
        placeholder.remove();
    }
    
    // Add message
    const messageHTML = createMessageHTML(message);
    container.insertAdjacentHTML('beforeend', messageHTML);
    
    // Scroll to bottom
    const messagesArea = document.getElementById('messagesArea');
    if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
};

// Send Message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const content = input.value.trim();
    
    if (!content || !STATE.currentChannel) return;
    
    try {
        const message = await API.sendMessage(STATE.currentChannel.id, content);
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        
        // Add to local state (WebSocket will also send it)
        const channelMessages = STATE.messages.get(STATE.currentChannel.id) || [];
        channelMessages.push(message);
        STATE.messages.set(STATE.currentChannel.id, channelMessages);
        
        // Render message if not already rendered by WebSocket
        if (!document.querySelector(`[data-message-id="${message.id}"]`)) {
            window.renderMessage(message);
        }
        
    } catch (error) {
        console.error('Send message error:', error);
        Toast.error('Failed to send message');
    }
}

// Message Input Enhancement
const messageInput = document.getElementById('messageInput');
if (messageInput) {
    // Auto-resize
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
    
    // Send on Enter
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Typing indicator
    let typingTimeout;
    messageInput.addEventListener('input', function() {
        if (WebSocketManager.ws && WebSocketManager.ws.readyState === WebSocket.OPEN) {
            clearTimeout(typingTimeout);
            WebSocketManager.sendTyping();
            
            typingTimeout = setTimeout(() => {
                // Stop typing indicator
            }, 1000);
        }
    });
}

// UI Actions
function toggleSection(sectionName) {
    // TODO: Collapse/expand sections
}

function showCreateChannel() {
    Modal.prompt({
        title: 'Create Channel',
        message: 'Enter a channel name',
        placeholder: 'marketing',
        confirmText: 'Create',
        onConfirm: async (name) => {
            if (!name) return;
            
            try {
                const workspace = StorageManager.getWorkspace();
                await API.createChannel(workspace.id, name, '');
                
                Toast.success('Channel created!');
                await loadChannels(workspace.id);
                
            } catch (error) {
                Toast.error(error.message || 'Failed to create channel');
            }
        }
    });
}

function showNewDM() {
    Toast.info('Direct messages coming soon!');
}

function toggleWorkspaceMenu() {
    Toast.info('Workspace menu coming soon!');
}

function toggleProfileMenu() {
    Modal.show({
        title: 'Profile',
        content: `
            <div style="text-align: center;">
                <div class="message-avatar" style="width: 80px; height: 80px; font-size: 32px; margin: 0 auto var(--space-md);">
                    ${(STATE.user?.first_name || 'U').charAt(0).toUpperCase()}
                </div>
                <h3 style="margin-bottom: var(--space-sm);">${STATE.user?.first_name || STATE.user?.username}</h3>
                <p style="color: var(--text-secondary); margin-bottom: var(--space-lg);">${STATE.user?.email}</p>
                <button class="btn btn-danger btn-block" onclick="Modal.close(); handleLogout();">
                    Sign Out
                </button>
            </div>
        `
    });
}

function handleLogout() {
    Modal.confirm({
        title: 'Sign Out',
        message: 'Are you sure you want to sign out?',
        confirmText: 'Sign Out',
        onConfirm: () => {
            WebSocketManager.disconnect();
            API.logout();
        }
    });
}

function toggleSearch() {
    Toast.info('Search coming soon!');
}

function showChannelMembers() {
    Toast.info('Channel members coming soon!');
}

function showSettings() {
    Toast.info('Settings coming soon!');
}

// File Upload
document.getElementById('fileInput')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    for (const file of files) {
        if (file.size > CONFIG.UPLOAD_MAX_SIZE) {
            Toast.error(`${file.name} is too large (max 10MB)`);
            continue;
        }
        
        try {
            Toast.info(`Uploading ${file.name}...`);
            
            await API.uploadFile(file, STATE.currentChannel.id);
            
            Toast.success(`${file.name} uploaded!`);
            
            // Reload messages
            await loadMessages(STATE.currentChannel.id);
            
        } catch (error) {
            Toast.error(`Failed to upload ${file.name}`);
        }
    }
    
    // Reset input
    e.target.value = '';
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 BlackMess initializing...');
    checkAuth();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    WebSocketManager.disconnect();
});

console.log('✅ App loaded');

// Update showSettings function
function showSettings() {
    Settings.show();
}

// Update toggleProfileMenu function  
function toggleProfileMenu() {
    Profile.show();
}

// Update toggleSearch function
function toggleSearch() {
    Search.toggle();
}

console.log('✅ App updated with new features');

// Wire up new components
function showChannelMembers() {
    ChannelDetails.show(STATE.currentChannel?.id);
}

function showNotifications() {
    Notifications.show();
}

function showFiles() {
    FileManager.show();
}

// Update file upload handler
const fileInputOld = document.getElementById('fileInput');
if (fileInputOld) {
    fileInputOld.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        
        for (const file of files) {
            if (file.size > CONFIG.UPLOAD_MAX_SIZE) {
                Toast.error(`${file.name} too large (max 10MB)`);
                continue;
            }
            
            try {
                Toast.info(`Uploading ${file.name}...`);
                
                // Add to file manager
                FileManager.add(file);
                
                // TODO: Upload to server
                // await API.uploadFile(file, STATE.currentChannel.id);
                
                Toast.success(`${file.name} uploaded!`);
                
            } catch (error) {
                Toast.error(`Failed to upload ${file.name}`);
            }
        }
        
        e.target.value = '';
    });
}

console.log('✅ All features wired up!');

// Initialize all modules
document.addEventListener('DOMContentLoaded', () => {
    DirectMessages.init();
    Mentions.init();
});

// Update showNewDM function
function showNewDM() {
    DirectMessages.showNewDM();
}

// Add user management function
function showUserManagement() {
    UserManagement.show();
}

// Update message rendering to support threads
const originalRenderMessage = window.renderMessage;
window.renderMessage = function(message) {
    const html = originalRenderMessage ? originalRenderMessage(message) : createMessageHTML(message);
    
    // Add thread button if has replies
    if (message.reply_count && message.reply_count > 0) {
        const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
        if (messageEl) {
            const threadBtn = document.createElement('button');
            threadBtn.className = 'thread-btn';
            threadBtn.innerHTML = `${message.reply_count} replies`;
            threadBtn.onclick = () => Threads.show(message.id);
            messageEl.querySelector('.message-content').appendChild(threadBtn);
        }
    }
};

console.log('✅ Final wiring complete!');
