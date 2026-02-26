const ChannelDetails = {
    show(channelId) {
        const channel = STATE.channels.find(c => c.id === channelId) || STATE.currentChannel;
        if (!channel) return;
        
        const content = document.createElement('div');
        content.className = 'channel-details-container';
        content.innerHTML = `
            <div class="channel-details-header">
                <div class="channel-icon">#</div>
                <div>
                    <h2>${channel.name}</h2>
                    <p>${channel.description || 'No description'}</p>
                </div>
            </div>
            
            <div class="channel-details-section">
                <h3>Members (${channel.member_count || 0})</h3>
                <div class="members-list">
                    ${this.renderMembers(channel)}
                </div>
                <button class="btn btn-secondary btn-block" onclick="ChannelDetails.inviteMembers()">
                    + Invite Members
                </button>
            </div>
            
            <div class="channel-details-section">
                <h3>Settings</h3>
                <button class="settings-btn" onclick="ChannelDetails.editChannel()">
                    <svg width="20" height="20"><path d="M2 12l3-1 7-7 1 1-7 7-1 3-3-3z" stroke="currentColor" fill="none"/></svg>
                    Edit Channel Details
                </button>
                <button class="settings-btn" onclick="ChannelDetails.notifications()">
                    <svg width="20" height="20"><path d="M10 2a6 6 0 016 6v3l2 3H2l2-3V8a6 6 0 016-6z" stroke="currentColor" fill="none"/></svg>
                    Notification Preferences
                </button>
            </div>
            
            <div class="channel-details-section">
                <button class="btn btn-danger btn-block" onclick="ChannelDetails.leave()">
                    Leave Channel
                </button>
            </div>
        `;
        
        Modal.show({
            title: '',
            content: content,
            footer: null
        });
    },
    
    renderMembers(channel) {
        // Mock members
        const members = [
            { name: STATE.user?.first_name || 'You', role: 'Admin' }
        ];
        
        return members.map(m => `
            <div class="member-item">
                <div class="member-avatar">${m.name.charAt(0)}</div>
                <div class="member-info">
                    <div class="member-name">${m.name}</div>
                    <div class="member-role">${m.role}</div>
                </div>
            </div>
        `).join('');
    },
    
    inviteMembers() {
        Toast.info('Invite members coming soon!');
    },
    
    editChannel() {
        Toast.info('Edit channel coming soon!');
    },
    
    notifications() {
        Toast.info('Notification settings coming soon!');
    },
    
    leave() {
        Modal.confirm({
            title: 'Leave Channel',
            message: 'Are you sure you want to leave this channel?',
            confirmText: 'Leave',
            onConfirm: () => {
                Toast.success('Left channel!');
                Modal.close();
            }
        });
    }
};

console.log('✅ Channel Details loaded');
