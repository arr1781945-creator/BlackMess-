const MessageActions = {
    show(messageElement, messageId) {
        // Remove existing menu
        this.hide();
        
        const menu = document.createElement('div');
        menu.className = 'message-actions-menu';
        menu.id = 'messageActionsMenu';
        
        const message = this.getMessageById(messageId);
        const isOwn = message?.user?.id === STATE.user?.id;
        
        menu.innerHTML = `
            <button class="action-btn" onclick="MessageActions.addReaction(${messageId})">
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/>
                    <circle cx="6" cy="7" r="1" fill="currentColor"/>
                    <circle cx="10" cy="7" r="1" fill="currentColor"/>
                    <path d="M5 10c0 2 1.5 3 3 3s3-1 3-3" stroke="currentColor" fill="none"/>
                </svg>
                Add Reaction
            </button>
            
            <button class="action-btn" onclick="MessageActions.reply(${messageId})">
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <path d="M8 2L2 8l6 6M2 8h12" stroke="currentColor" fill="none" stroke-width="2"/>
                </svg>
                Reply in Thread
            </button>
            
            <button class="action-btn" onclick="MessageActions.copy(${messageId})">
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <rect x="3" y="3" width="8" height="10" rx="1" stroke="currentColor" fill="none"/>
                    <path d="M5 3V2a1 1 0 011-1h7a1 1 0 011 1v10a1 1 0 01-1 1h-1" stroke="currentColor" fill="none"/>
                </svg>
                Copy Text
            </button>
            
            ${isOwn ? `
                <button class="action-btn" onclick="MessageActions.edit(${messageId})">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M2 12l3-1 7-7 1 1-7 7-1 3-3-3zM12 2l2 2" stroke="currentColor" fill="none" stroke-width="2"/>
                    </svg>
                    Edit Message
                </button>
                
                <button class="action-btn danger" onclick="MessageActions.delete(${messageId})">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4" stroke="currentColor" fill="none" stroke-width="2"/>
                    </svg>
                    Delete Message
                </button>
            ` : ''}
            
            <button class="action-btn" onclick="MessageActions.pin(${messageId})">
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <path d="M8 2v6M5 5l3-3 3 3M8 8v6" stroke="currentColor" fill="none" stroke-width="2"/>
                </svg>
                Pin Message
            </button>
        `;
        
        // Position menu
        const rect = messageElement.getBoundingClientRect();
        menu.style.top = `${rect.top}px`;
        menu.style.right = '20px';
        
        document.body.appendChild(menu);
        
        // Click outside to close
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside);
        }, 10);
    },
    
    hide() {
        const menu = document.getElementById('messageActionsMenu');
        if (menu) menu.remove();
        document.removeEventListener('click', this.handleClickOutside);
    },
    
    handleClickOutside(e) {
        const menu = document.getElementById('messageActionsMenu');
        if (menu && !menu.contains(e.target)) {
            MessageActions.hide();
        }
    },
    
    getMessageById(id) {
        if (!STATE.currentChannel) return null;
        const messages = STATE.messages.get(STATE.currentChannel.id) || [];
        return messages.find(m => m.id === id);
    },
    
    addReaction(messageId) {
        const reactions = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];
        
        const picker = document.createElement('div');
        picker.className = 'reaction-picker';
        picker.innerHTML = reactions.map(emoji => 
            `<button class="reaction-btn" onclick="MessageActions.selectReaction(${messageId}, '${emoji}')">${emoji}</button>`
        ).join('');
        
        const menu = document.getElementById('messageActionsMenu');
        if (menu) {
            menu.appendChild(picker);
        }
    },
    
    async selectReaction(messageId, emoji) {
        try {
            // TODO: API call
            Toast.success(`Reacted with ${emoji}`);
            this.hide();
            
            // Add reaction to UI
            const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageEl) {
                let reactionsEl = messageEl.querySelector('.message-reactions');
                if (!reactionsEl) {
                    reactionsEl = document.createElement('div');
                    reactionsEl.className = 'message-reactions';
                    messageEl.querySelector('.message-content').appendChild(reactionsEl);
                }
                
                reactionsEl.innerHTML += `
                    <span class="reaction-item">
                        ${emoji} <span class="reaction-count">1</span>
                    </span>
                `;
            }
        } catch (error) {
            Toast.error('Failed to add reaction');
        }
    },
    
    reply(messageId) {
        const message = this.getMessageById(messageId);
        if (!message) return;
        
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = `Replying to ${message.user?.first_name || 'User'}: "${message.content}"\n\n`;
            input.focus();
        }
        
        this.hide();
    },
    
    copy(messageId) {
        const message = this.getMessageById(messageId);
        if (!message) return;
        
        navigator.clipboard.writeText(message.content);
        Toast.success('Message copied!');
        this.hide();
    },
    
    edit(messageId) {
        const message = this.getMessageById(messageId);
        if (!message) return;
        
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;
        
        const textEl = messageEl.querySelector('.message-text');
        if (!textEl) return;
        
        const originalText = message.content;
        
        textEl.innerHTML = `
            <textarea class="message-edit-input" style="width: 100%; padding: 8px; border: 2px solid var(--slack-purple); border-radius: 4px;">${originalText}</textarea>
            <div style="margin-top: 8px; display: flex; gap: 8px;">
                <button class="btn btn-sm btn-primary" onclick="MessageActions.saveEdit(${messageId})">Save</button>
                <button class="btn btn-sm btn-secondary" onclick="MessageActions.cancelEdit(${messageId}, '${originalText.replace(/'/g, "\\'")}')">Cancel</button>
            </div>
        `;
        
        textEl.querySelector('textarea').focus();
        this.hide();
    },
    
    async saveEdit(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        const textarea = messageEl?.querySelector('.message-edit-input');
        if (!textarea) return;
        
        const newContent = textarea.value.trim();
        if (!newContent) {
            Toast.error('Message cannot be empty');
            return;
        }
        
        try {
            // TODO: API call
            Toast.success('Message updated!');
            
            const textEl = messageEl.querySelector('.message-text');
            textEl.innerHTML = `${Utils.escapeHtml(newContent)} <span style="color: var(--text-tertiary); font-size: 11px;">(edited)</span>`;
            
        } catch (error) {
            Toast.error('Failed to update message');
        }
    },
    
    cancelEdit(messageId, originalText) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        const textEl = messageEl?.querySelector('.message-text');
        if (textEl) {
            textEl.innerHTML = Utils.escapeHtml(originalText);
        }
    },
    
    delete(messageId) {
        Modal.confirm({
            title: 'Delete Message',
            message: 'Are you sure you want to delete this message? This cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    // TODO: API call
                    Toast.success('Message deleted!');
                    
                    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
                    if (messageEl) {
                        messageEl.style.animation = 'fadeOut 0.3s ease';
                        setTimeout(() => messageEl.remove(), 300);
                    }
                    
                } catch (error) {
                    Toast.error('Failed to delete message');
                }
            }
        });
        
        this.hide();
    },
    
    async pin(messageId) {
        try {
            // TODO: API call
            Toast.success('Message pinned!');
            this.hide();
        } catch (error) {
            Toast.error('Failed to pin message');
        }
    }
};

// Add hover effect to messages
document.addEventListener('mouseover', (e) => {
    const message = e.target.closest('.message');
    if (message && !message.querySelector('.message-hover-actions')) {
        const messageId = message.dataset.messageId;
        if (!messageId) return;
        
        const hoverActions = document.createElement('div');
        hoverActions.className = 'message-hover-actions';
        hoverActions.innerHTML = `
            <button class="hover-action-btn" onclick="MessageActions.show(this.closest('.message'), ${messageId}); event.stopPropagation();">
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
                </svg>
            </button>
        `;
        message.appendChild(hoverActions);
    }
});

document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget || !e.target.closest('.message')?.contains(e.relatedTarget)) {
        const message = e.target.closest('.message');
        if (message) {
            const hoverActions = message.querySelector('.message-hover-actions');
            if (hoverActions) hoverActions.remove();
        }
    }
});

console.log('✅ Message Actions loaded');
