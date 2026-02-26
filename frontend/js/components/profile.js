const Profile = {
    show(userId = null) {
        const user = userId ? this.getUserById(userId) : STATE.user;
        const isOwnProfile = !userId || userId === STATE.user?.id;
        
        const content = document.createElement('div');
        content.className = 'profile-container';
        content.innerHTML = `
            <div class="profile-header">
                <div class="profile-cover" style="background: linear-gradient(135deg, ${this.getRandomGradient()});"></div>
                <div class="profile-avatar-wrapper">
                    <div class="profile-avatar-large">
                        ${(user?.first_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    ${isOwnProfile ? `
                        <button class="profile-avatar-edit" onclick="Profile.changeAvatar()">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M2 12l3-1 7-7 1 1-7 7-1 3-3-3zM12 2l2 2" stroke="white" fill="none" stroke-width="2"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="profile-body">
                <div class="profile-info">
                    <h2 class="profile-name">${user?.first_name || user?.username || 'User'}</h2>
                    <p class="profile-username">@${user?.username || 'username'}</p>
                    <p class="profile-email">${user?.email || 'email@example.com'}</p>
                    
                    <div class="profile-status">
                        <span class="status-indicator active"></span>
                        <span>Active now</span>
                    </div>
                </div>
                
                ${isOwnProfile ? `
                    <div class="profile-actions">
                        <button class="btn btn-primary" onclick="Settings.show()">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <circle cx="8" cy="8" r="2" stroke="currentColor" fill="none"/>
                                <path d="M8 1v2M8 13v2M15 8h-2M3 8H1M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4M12.5 12.5l-1.4-1.4M4.9 4.9L3.5 3.5" stroke="currentColor"/>
                            </svg>
                            Edit Profile
                        </button>
                    </div>
                ` : `
                    <div class="profile-actions">
                        <button class="btn btn-primary" onclick="Profile.sendMessage('${user?.id}')">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M2 2l12 6-12 6V9l8-1-8-1V2z" fill="currentColor"/>
                            </svg>
                            Send Message
                        </button>
                    </div>
                `}
                
                <div class="profile-section">
                    <h3>About</h3>
                    <div class="profile-field">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M5 3h6M3 6h10M3 9h10M5 12h6" stroke="currentColor" fill="none" stroke-width="2"/>
                        </svg>
                        <span>${user?.bio || 'No bio yet'}</span>
                    </div>
                    <div class="profile-field">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <rect x="3" y="4" width="10" height="9" rx="1" stroke="currentColor" fill="none"/>
                            <path d="M3 7h10M6 4V2M10 4V2" stroke="currentColor"/>
                        </svg>
                        <span>Joined ${this.formatDate(user?.date_joined)}</span>
                    </div>
                    <div class="profile-field">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/>
                            <path d="M8 4v4l3 2" stroke="currentColor"/>
                        </svg>
                        <span>Local time: ${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>Activity</h3>
                    <div class="profile-stats">
                        <div class="profile-stat">
                            <div class="stat-value">0</div>
                            <div class="stat-label">Messages</div>
                        </div>
                        <div class="profile-stat">
                            <div class="stat-value">0</div>
                            <div class="stat-label">Channels</div>
                        </div>
                        <div class="profile-stat">
                            <div class="stat-value">0</div>
                            <div class="stat-label">Files Shared</div>
                        </div>
                    </div>
                </div>
                
                ${isOwnProfile ? `
                    <div class="profile-section">
                        <h3>Preferences</h3>
                        <button class="profile-pref-btn" onclick="Settings.show()">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 016 6v3l2 3H2l2-3V8a6 6 0 016-6z" stroke="currentColor" fill="none" stroke-width="2"/>
                            </svg>
                            <div>
                                <strong>Notifications</strong>
                                <p>Manage notification settings</p>
                            </div>
                        </button>
                        <button class="profile-pref-btn" onclick="Settings.show()">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="6" stroke="currentColor" fill="none" stroke-width="2"/>
                            </svg>
                            <div>
                                <strong>Appearance</strong>
                                <p>Theme and display settings</p>
                            </div>
                        </button>
                        <button class="profile-pref-btn" onclick="Settings.show()">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <rect x="5" y="8" width="10" height="9" rx="2" stroke="currentColor" fill="none" stroke-width="2"/>
                                <path d="M7 8V6a3 3 0 016 0v2" stroke="currentColor" fill="none" stroke-width="2"/>
                            </svg>
                            <div>
                                <strong>Privacy</strong>
                                <p>Control your privacy</p>
                            </div>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        Modal.show({
            title: '',
            content: content,
            footer: null,
            closeOnOverlay: true
        });
    },
    
    getRandomGradient() {
        const gradients = [
            '#667eea 0%, #764ba2 100%',
            '#f093fb 0%, #f5576c 100%',
            '#4facfe 0%, #00f2fe 100%',
            '#43e97b 0%, #38f9d7 100%',
            '#fa709a 0%, #fee140 100%',
            '#30cfd0 0%, #330867 100%'
        ];
        return gradients[Math.floor(Math.random() * gradients.length)];
    },
    
    formatDate(date) {
        if (!date) return 'Unknown';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    },
    
    getUserById(userId) {
        // TODO: Fetch user from API
        return STATE.user;
    },
    
    async changeAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 5 * 1024 * 1024) {
                Toast.error('Image too large (max 5MB)');
                return;
            }
            
            try {
                Toast.info('Uploading avatar...');
                
                // TODO: Upload to server
                // const formData = new FormData();
                // formData.append('avatar', file);
                // await API.uploadAvatar(formData);
                
                Toast.success('Avatar updated!');
                Modal.close();
                this.show();
                
            } catch (error) {
                Toast.error(error.message || 'Failed to upload avatar');
            }
        };
        
        input.click();
    },
    
    sendMessage(userId) {
        Toast.info('Direct messages coming soon!');
        Modal.close();
    }
};

console.log('✅ Profile loaded');
