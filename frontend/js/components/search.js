const Search = {
    isOpen: false,
    results: {
        messages: [],
        channels: [],
        users: []
    },
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.show();
        }
    },
    
    show() {
        this.isOpen = true;
        
        const overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.id = 'searchOverlay';
        
        overlay.innerHTML = `
            <div class="search-modal">
                <div class="search-header">
                    <div class="search-input-wrapper">
                        <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" stroke-width="2"/>
                            <path d="M12 12l6 6" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        <input type="text" 
                               id="searchInput" 
                               class="search-input" 
                               placeholder="Search messages, channels, and people..."
                               autofocus>
                        <button class="search-close" onclick="Search.close()">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="search-filters">
                        <button class="search-filter active" data-filter="all">All</button>
                        <button class="search-filter" data-filter="messages">Messages</button>
                        <button class="search-filter" data-filter="channels">Channels</button>
                        <button class="search-filter" data-filter="people">People</button>
                    </div>
                </div>
                
                <div class="search-body" id="searchResults">
                    <div class="search-empty">
                        <svg width="64" height="64" viewBox="0 0 64 64" opacity="0.3">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" fill="none" stroke-width="4"/>
                            <path d="M40 40l20 20" stroke="currentColor" stroke-width="4"/>
                        </svg>
                        <p>Start typing to search...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Setup event listeners
        const input = document.getElementById('searchInput');
        input.addEventListener('input', Utils.debounce((e) => {
            this.performSearch(e.target.value);
        }, 300));
        
        // Filter buttons
        document.querySelectorAll('.search-filter').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.search-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterResults(btn.dataset.filter);
            };
        });
        
        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.close();
            }
        };
        
        // Focus input
        setTimeout(() => input.focus(), 100);
    },
    
    close() {
        this.isOpen = false;
        const overlay = document.getElementById('searchOverlay');
        if (overlay) {
            overlay.remove();
        }
    },
    
    async performSearch(query) {
        if (!query || query.trim().length < 2) {
            this.showEmpty();
            return;
        }
        
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
        
        try {
            // TODO: API call to search
            // const results = await API.search(query);
            
            // Mock results for now
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.results = {
                messages: [
                    {
                        id: 1,
                        content: `Message containing "${query}"`,
                        user: { name: 'John Doe' },
                        channel: { name: 'general' },
                        created_at: new Date()
                    }
                ],
                channels: [
                    {
                        id: 1,
                        name: query.toLowerCase(),
                        description: 'Channel description'
                    }
                ],
                users: [
                    {
                        id: 1,
                        name: query,
                        username: query.toLowerCase()
                    }
                ]
            };
            
            this.displayResults();
            
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
        }
    },
    
    displayResults() {
        const { messages, channels, users } = this.results;
        const resultsContainer = document.getElementById('searchResults');
        
        if (messages.length === 0 && channels.length === 0 && users.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-empty">
                    <svg width="64" height="64" viewBox="0 0 64 64" opacity="0.3">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" fill="none" stroke-width="4"/>
                        <path d="M20 32h24M32 20v24" stroke="currentColor" stroke-width="4"/>
                    </svg>
                    <p>No results found</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Messages
        if (messages.length > 0) {
            html += `
                <div class="search-section">
                    <h4 class="search-section-title">Messages</h4>
                    ${messages.map(msg => `
                        <div class="search-result" onclick="Search.selectMessage(${msg.id})">
                            <div class="search-result-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20">
                                    <path d="M2 2h16v12H6l-4 4V2z" stroke="currentColor" fill="none" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="search-result-content">
                                <div class="search-result-title">${Utils.escapeHtml(msg.content)}</div>
                                <div class="search-result-meta">
                                    in #${msg.channel.name} • ${msg.user.name} • ${Utils.formatTime(msg.created_at)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Channels
        if (channels.length > 0) {
            html += `
                <div class="search-section">
                    <h4 class="search-section-title">Channels</h4>
                    ${channels.map(ch => `
                        <div class="search-result" onclick="Search.selectChannel(${ch.id})">
                            <div class="search-result-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20">
                                    <path d="M5 2v16M15 2v16M2 5h16M2 15h16" stroke="currentColor" fill="none" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="search-result-content">
                                <div class="search-result-title">#${ch.name}</div>
                                <div class="search-result-meta">${ch.description || 'No description'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Users
        if (users.length > 0) {
            html += `
                <div class="search-section">
                    <h4 class="search-section-title">People</h4>
                    ${users.map(user => `
                        <div class="search-result" onclick="Search.selectUser(${user.id})">
                            <div class="search-result-avatar">
                                ${(user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div class="search-result-content">
                                <div class="search-result-title">${user.name}</div>
                                <div class="search-result-meta">@${user.username}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        resultsContainer.innerHTML = html;
    },
    
    filterResults(filter) {
        // TODO: Implement filter logic
        Toast.info(`Filter: ${filter}`);
    },
    
    showEmpty() {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = `
            <div class="search-empty">
                <svg width="64" height="64" viewBox="0 0 64 64" opacity="0.3">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" fill="none" stroke-width="4"/>
                    <path d="M40 40l20 20" stroke="currentColor" stroke-width="4"/>
                </svg>
                <p>Start typing to search...</p>
            </div>
        `;
    },
    
    selectMessage(id) {
        Toast.info('Jump to message coming soon!');
        this.close();
    },
    
    selectChannel(id) {
        const channel = STATE.channels.find(c => c.id === id);
        if (channel) {
            selectChannel(channel);
            this.close();
        }
    },
    
    selectUser(id) {
        Profile.show(id);
        this.close();
    }
};

// Keyboard shortcut: Ctrl+K or Cmd+K
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        Search.toggle();
    }
    
    if (e.key === 'Escape' && Search.isOpen) {
        Search.close();
    }
});

console.log('✅ Search loaded');
