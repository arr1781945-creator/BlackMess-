const Notifications = {
    items: [],
    
    show() {
        const content = document.createElement('div');
        content.className = 'notifications-container';
        content.innerHTML = `
            <div class="notifications-header">
                <h3>Notifications</h3>
                <button class="btn-text" onclick="Notifications.markAllRead()">Mark all as read</button>
            </div>
            
            <div class="notifications-list" id="notificationsList">
                ${this.renderNotifications()}
            </div>
        `;
        
        Modal.show({
            title: '',
            content: content,
            footer: null
        });
    },
    
    renderNotifications() {
        if (this.items.length === 0) {
            return `
                <div class="notifications-empty">
                    <svg width="64" height="64" viewBox="0 0 64 64" opacity="0.3">
                        <path d="M32 8a24 24 0 0124 24v12l8 12H0l8-12V32A24 24 0 0132 8z" fill="currentColor"/>
                    </svg>
                    <p>No notifications yet</p>
                </div>
            `;
        }
        
        return this.items.map(n => `
            <div class="notification-item ${n.read ? 'read' : 'unread'}">
                <div class="notification-icon">${n.icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-text">${n.text}</div>
                    <div class="notification-time">${Utils.formatTime(n.time)}</div>
                </div>
            </div>
        `).join('');
    },
    
    add(title, text, icon = '🔔') {
        this.items.unshift({
            id: Utils.generateId(),
            title,
            text,
            icon,
            time: new Date(),
            read: false
        });
        
        this.updateBadge();
    },
    
    markAllRead() {
        this.items.forEach(item => item.read = true);
        this.updateBadge();
        Toast.success('All notifications marked as read');
        Modal.close();
    },
    
    updateBadge() {
        const unreadCount = this.items.filter(i => !i.read).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }
};

console.log('✅ Notifications loaded');
