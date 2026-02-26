const Toast = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'info', duration = 3000) {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${Utils.escapeHtml(message)}</div>
        `;
        
        this.container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    this.container.removeChild(toast);
                }
            }, 300);
        }, duration);
    },
    
    success(message, duration) {
        this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
        this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
        this.show(message, 'info', duration);
    },
    
    getIcon(type) {
        const icons = {
            success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2BAC76" stroke-width="2"/>
                <path d="M8 12l2 2 4-4" stroke="#2BAC76" stroke-width="2"/>
            </svg>`,
            error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#E01E5A" stroke-width="2"/>
                <path d="M8 8l8 8M16 8l-8 8" stroke="#E01E5A" stroke-width="2"/>
            </svg>`,
            warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 20h20L12 2z" stroke="#ECB22E" stroke-width="2"/>
                <path d="M12 9v4M12 17h.01" stroke="#ECB22E" stroke-width="2"/>
            </svg>`,
            info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#1264A3" stroke-width="2"/>
                <path d="M12 8v4M12 16h.01" stroke="#1264A3" stroke-width="2"/>
            </svg>`
        };
        
        return icons[type] || icons.info;
    }
};

// Add animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Toast loaded');
