const Modal = {
    active: null,
    
    show(options) {
        const {
            title = '',
            content = '',
            footer = null,
            onClose = null,
            closeOnOverlay = true
        } = options;
        
        // Remove existing modal
        this.close();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        if (closeOnOverlay) {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    this.close();
                    if (onClose) onClose();
                }
            };
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        // Header
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h2 class="modal-title">${Utils.escapeHtml(title)}</h2>
            <button class="modal-close" onclick="Modal.close()">
                <svg width="20" height="20" viewBox="0 0 20 20">
                    <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
        `;
        
        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }
        
        // Footer
        let footerEl = null;
        if (footer) {
            footerEl = document.createElement('div');
            footerEl.className = 'modal-footer';
            
            if (typeof footer === 'string') {
                footerEl.innerHTML = footer;
            } else if (footer instanceof HTMLElement) {
                footerEl.appendChild(footer);
            }
        }
        
        // Assemble
        modal.appendChild(header);
        modal.appendChild(body);
        if (footerEl) modal.appendChild(footerEl);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        this.active = overlay;
        
        return modal;
    },
    
    close() {
        if (this.active) {
            this.active.remove();
            this.active = null;
        }
    },
    
    confirm(options) {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            onConfirm = null,
            onCancel = null
        } = options;
        
        const content = `<p style="margin: 0; color: var(--text-secondary);">${Utils.escapeHtml(message)}</p>`;
        
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.gap = 'var(--space-sm)';
        footer.style.justifyContent = 'flex-end';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.onclick = () => {
            this.close();
            if (onCancel) onCancel();
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => {
            this.close();
            if (onConfirm) onConfirm();
        };
        
        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);
        
        this.show({
            title,
            content,
            footer,
            closeOnOverlay: false
        });
    },
    
    prompt(options) {
        const {
            title = 'Input',
            message = '',
            placeholder = '',
            defaultValue = '',
            confirmText = 'OK',
            cancelText = 'Cancel',
            onConfirm = null,
            onCancel = null
        } = options;
        
        const content = document.createElement('div');
        
        if (message) {
            const p = document.createElement('p');
            p.style.margin = '0 0 var(--space-md) 0';
            p.style.color = 'var(--text-secondary)';
            p.textContent = message;
            content.appendChild(p);
        }
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.placeholder = placeholder;
        input.value = defaultValue;
        input.style.width = '100%';
        input.style.padding = '10px 12px';
        input.style.border = '2px solid var(--border-color)';
        input.style.borderRadius = 'var(--border-radius)';
        input.style.fontSize = 'var(--font-size-md)';
        
        content.appendChild(input);
        
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.gap = 'var(--space-sm)';
        footer.style.justifyContent = 'flex-end';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.onclick = () => {
            this.close();
            if (onCancel) onCancel();
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => {
            const value = input.value.trim();
            this.close();
            if (onConfirm) onConfirm(value);
        };
        
        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);
        
        this.show({
            title,
            content,
            footer,
            closeOnOverlay: false
        });
        
        // Focus input
        setTimeout(() => input.focus(), 100);
        
        // Submit on Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });
    }
};

// Keyboard shortcut (ESC to close)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && Modal.active) {
        Modal.close();
    }
});

console.log('✅ Modal loaded');
