// Master Integration - Load All APIs

// Global API object
window.BlackMessAPI = {
    Auth: AuthFlow,
    Dashboard: DashboardAPI,
    WebSocket: WSManager,
    FileUpload: FileUpload,
    Features: Features
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 BlackMess API initialized');
    console.log('Available APIs:', Object.keys(window.BlackMessAPI));
});

// Export for use
console.log('✅ Master Integration loaded');
