const UserManagement = {
    show() {
        const content = document.createElement('div');
        content.className = 'user-management-container';
        content.innerHTML = `
            <div class="user-mgmt-tabs">
                <button class="tab-btn active" data-tab="invite">Invite Users</button>
                <button class="tab-btn" data-tab="members">Manage Members</button>
                <button class="tab-btn" data-tab="roles">Roles</button>
            </div>
            
            <div class="tab-content" id="inviteTab">
                <h3>Invite Users to ${STATE.workspace?.name || 'Workspace'}</h3>
                
                <div class="invite-method">
                    <label>Invite by Email</label>
                    <div style="display: flex; gap: var(--space-sm);">
                        <input type="email" id="inviteEmail" placeholder="name@company.com" class="form-control">
                        <button class="btn btn-primary" onclick="UserManagement.sendInvite()">Send Invite</button>
                    </div>
                </div>
                
                <div class="invite-method">
                    <label>Share Invite Link</label>
                    <div style="display: flex; gap: var(--space-sm);">
                        <input type="text" id="inviteLink" value="https://blackmess.com/invite/abc123" readonly class="form-control">
                        <button class="btn btn-secondary" onclick="UserManagement.copyLink()">Copy Link</button>
                    </div>
                </div>
            </div>
            
            <div class="tab-content hidden" id="membersTab">
                <h3>Workspace Members</h3>
                <div class="members-list">
                    ${this.renderMembers()}
                </div>
            </div>
            
            <div class="tab-content hidden" id="rolesTab">
                <h3>Roles & Permissions</h3>
                <div class="roles-list">
                    ${this.renderRoles()}
                </div>
            </div>
        `;
        
        Modal.show({
            title: 'User Management',
            content: content,
            footer: null
        });
        
        // Setup tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
                document.getElementById(btn.dataset.tab + 'Tab').classList.remove('hidden');
            };
        });
    },
    
    renderMembers() {
        const members = [
            { id: 1, name: STATE.user?.first_name || 'You', role: 'Admin', email: STATE.user?.email }
        ];
        
        return members.map(m => `
            <div class="member-row">
                <div class="member-avatar">${m.name.charAt(0)}</div>
                <div class="member-details">
                    <div class="member-name">${m.name}</div>
                    <div class="member-email">${m.email}</div>
                </div>
                <div class="member-role">${m.role}</div>
                <button class="icon-btn" onclick="UserManagement.removeMember(${m.id})">
                    <svg width="16" height="16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2"/></svg>
                </button>
            </div>
        `).join('');
    },
    
    renderRoles() {
        const roles = [
            { name: 'Admin', permissions: ['Manage workspace', 'Invite users', 'Delete messages'] },
            { name: 'Member', permissions: ['Send messages', 'Create channels'] },
            { name: 'Guest', permissions: ['Send messages'] }
        ];
        
        return roles.map(r => `
            <div class="role-card">
                <h4>${r.name}</h4>
                <ul>
                    ${r.permissions.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    },
    
    async sendInvite() {
        const email = document.getElementById('inviteEmail')?.value.trim();
        if (!email) {
            Toast.error('Enter email address');
            return;
        }
        
        try {
            Toast.info('Sending invite...');
            
            // TODO: API call
            // await API.inviteUser(email);
            
            Toast.success(`Invite sent to ${email}!`);
            document.getElementById('inviteEmail').value = '';
            
        } catch (error) {
            Toast.error('Failed to send invite');
        }
    },
    
    copyLink() {
        const link = document.getElementById('inviteLink')?.value;
        if (link) {
            navigator.clipboard.writeText(link);
            Toast.success('Link copied!');
        }
    },
    
    removeMember(userId) {
        Modal.confirm({
            title: 'Remove Member',
            message: 'Are you sure you want to remove this member from the workspace?',
            confirmText: 'Remove',
            onConfirm: async () => {
                try {
                    // TODO: API call
                    Toast.success('Member removed!');
                } catch (error) {
                    Toast.error('Failed to remove member');
                }
            }
        });
    }
};

console.log('✅ User Management loaded');
