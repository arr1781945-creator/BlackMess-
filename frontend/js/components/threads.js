const Threads = {
    activeThread: null,
    
    show(messageId) {
        const message = this.getMessageById(messageId);
        if (!message) return;
        
        const sidebar = document.createElement('div');
        sidebar.className = 'thread-sidebar';
        sidebar.id = 'threadSidebar';
        sidebar.innerHTML = `
            <div class="thread-header">
                <h3>Thread</h3>
                <button class="icon-btn" onclick="Threads.close()">
                    <svg width="20" height="20" viewBox="0 0 20 20">
                        <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
            
            <div class="thread-parent-message">
                <div class="message-avatar">${(message.user?.first_name || 'U').charAt(0).toUpperCase()}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${message.user?.first_name || 'User'}</span>
                        <span class="message-time">${Utils.formatTime(message.created_at)}</span>
                    </div>
                    <div class="message-text">${Utils.escapeHtml(message.content)}</div>
                </div>
            </div>
            
            <div class="thread-replies" id="threadReplies">
                <div class="thread-empty">No replies yet</div>
            </div>
            
            <div class="thread-input">
                <textarea id="threadInput" placeholder="Reply..." rows="3"></textarea>
                <button class="btn btn-primary btn-sm" onclick="Threads.sendReply(${messageId})">Send</button>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        this.activeThread = messageId;
        
        // Load replies
        this.loadReplies(messageId);
    },
    
    close() {
        const sidebar = document.getElementById('threadSidebar');
        if (sidebar) {
            sidebar.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => sidebar.remove(), 300);
        }
        this.activeThread = null;
    },
    
    async loadReplies(messageId) {
        try {
            // TODO: API call
            const replies = [];
            
            const container = document.getElementById('threadReplies');
            if (replies.length === 0) {
                container.innerHTML = '<div class="thread-empty">No replies yet</div>';
            } else {
                container.innerHTML = replies.map(r => this.renderReply(r)).join('');
            }
            
        } catch (error) {
            console.error('Load replies error:', error);
        }
    },
    
    renderReply(reply) {
        return `
            <div class="thread-reply">
                <div class="message-avatar">${(reply.user?.first_name || 'U').charAt(0).toUpperCase()}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author">${reply.user?.first_name || 'User'}</span>
                        <span class="message-time">${Utils.formatTime(reply.created_at)}</span>
                    </div>
                    <div class="message-text">${Utils.escapeHtml(reply.content)}</div>
                </div>
            </div>
        `;
    },
    
    async sendReply(messageId) {
        const input = document.getElementById('threadInput');
        if (!input) return;
        
        const content = input.value.trim();
        if (!content) return;
        
        try {
            Toast.info('Sending reply...');
            
            // TODO: API call
            // await API.sendReply(messageId, content);
            
            Toast.success('Reply sent!');
            input.value = '';
            
            // Reload replies
            await this.loadReplies(messageId);
            
        } catch (error) {
            Toast.error('Failed to send reply');
        }
    },
    
    getMessageById(id) {
        if (!STATE.currentChannel) return null;
        const messages = STATE.messages.get(STATE.currentChannel.id) || [];
        return messages.find(m => m.id === id);
    }
};

const Mentions = {
    users: [],
    
    init() {
        this.setupMentionDetection();
    },
    
    setupMentionDetection() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        input.addEventListener('input', (e) => {
            const text = e.target.value;
            const cursorPos = e.target.selectionStart;
            
            // Detect @ symbol
            const beforeCursor = text.slice(0, cursorPos);
            const lastAt = beforeCursor.lastIndexOf('@');
            
            if (lastAt !== -1 && lastAt === cursorPos - 1) {
                this.showMentionSuggestions(input);
            } else if (lastAt !== -1) {
                const query = beforeCursor.slice(lastAt + 1);
                if (query && !query.includes(' ')) {
                    this.filterSuggestions(query);
                }
            }
        });
    },
    
    showMentionSuggestions(input) {
        // Remove existing
        this.hideSuggestions();
        
        // Create suggestions
        const suggestions = document.createElement('div');
        suggestions.className = 'mention-suggestions';
        suggestions.id = 'mentionSuggestions';
        
        // Mock users
        const users = [
            { id: 1, name: STATE.user?.first_name || 'You' }
        ];
        
        suggestions.innerHTML = users.map(u => `
            <div class="mention-item" onclick="Mentions.selectUser(${u.id}, '${u.name}')">
                <div class="mention-avatar">${u.name.charAt(0)}</div>
                <span>${u.name}</span>
            </div>
        `).join('');
        
        // Position below input
        const rect = input.getBoundingClientRect();
        suggestions.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        suggestions.style.left = `${rect.left}px`;
        
        document.body.appendChild(suggestions);
    },
    
    filterSuggestions(query) {
        const suggestions = document.getElementById('mentionSuggestions');
        if (!suggestions) return;
        
        const items = suggestions.querySelectorAll('.mention-item');
        items.forEach(item => {
            const name = item.textContent.toLowerCase();
            item.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
        });
    },
    
    selectUser(userId, name) {
        const input = document.getElementById('messageInput');
        if (!input) return;
        
        const text = input.value;
        const lastAt = text.lastIndexOf('@');
        
        input.value = text.slice(0, lastAt) + `@${name} `;
        input.focus();
        
        this.hideSuggestions();
    },
    
    hideSuggestions() {
        const suggestions = document.getElementById('mentionSuggestions');
        if (suggestions) suggestions.remove();
    }
};

console.log('✅ Threads & Mentions loaded');
