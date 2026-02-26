const FileManager = {
    files: [],
    
    show() {
        const content = document.createElement('div');
        content.className = 'file-manager-container';
        content.innerHTML = `
            <div class="file-manager-header">
                <h3>Files</h3>
                <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                    Upload File
                </button>
            </div>
            
            <div class="file-list" id="fileList">
                ${this.renderFiles()}
            </div>
        `;
        
        Modal.show({
            title: '',
            content: content,
            footer: null
        });
    },
    
    renderFiles() {
        if (this.files.length === 0) {
            return `
                <div class="files-empty">
                    <svg width="64" height="64" viewBox="0 0 64 64" opacity="0.3">
                        <path d="M8 8h32l16 16v32H8z" fill="none" stroke="currentColor" stroke-width="4"/>
                    </svg>
                    <p>No files uploaded yet</p>
                </div>
            `;
        }
        
        return this.files.map(f => `
            <div class="file-item">
                <div class="file-icon">${this.getFileIcon(f.type)}</div>
                <div class="file-info">
                    <div class="file-name">${f.name}</div>
                    <div class="file-meta">${f.size} • ${Utils.formatTime(f.uploaded)}</div>
                </div>
                <div class="file-actions">
                    <button class="icon-btn" onclick="FileManager.download('${f.id}')">
                        <svg width="16" height="16"><path d="M8 2v10M4 8l4 4 4-4" stroke="currentColor" fill="none"/></svg>
                    </button>
                    <button class="icon-btn" onclick="FileManager.delete('${f.id}')">
                        <svg width="16" height="16"><path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5" stroke="currentColor" fill="none"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    getFileIcon(type) {
        const icons = {
            'image': '🖼️',
            'video': '🎥',
            'audio': '🎵',
            'pdf': '📄',
            'zip': '📦',
            'default': '📎'
        };
        return icons[type] || icons.default;
    },
    
    add(file) {
        this.files.push({
            id: Utils.generateId(),
            name: file.name,
            size: this.formatSize(file.size),
            type: this.getType(file.type),
            uploaded: new Date()
        });
    },
    
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },
    
    getType(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType.includes('zip')) return 'zip';
        return 'default';
    },
    
    download(id) {
        Toast.info('Download starting...');
    },
    
    delete(id) {
        Modal.confirm({
            title: 'Delete File',
            message: 'Are you sure you want to delete this file?',
            confirmText: 'Delete',
            onConfirm: () => {
                this.files = this.files.filter(f => f.id !== id);
                Toast.success('File deleted!');
                this.show();
            }
        });
    }
};

console.log('✅ File Manager loaded');
