// Enhanced Sidebar with Dynamic Menu Selection
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const body = document.body;
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    // Toggle sidebar collapse/expand
    const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
    
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            body.classList.toggle('sidebar-collapsed');
        });
    }
    
    // Toggle sidebar (for mobile/tablet)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            body.classList.toggle('sidebar-collapsed');
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('show');
            }
            if (sidebarOverlay) {
                sidebarOverlay.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
            }
        });
    }
    
    // Close sidebar when clicking overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.add('collapsed');
            sidebar.classList.remove('show');
            body.classList.add('sidebar-collapsed');
            this.style.display = 'none';
        });
    }
    
    // Close sidebar function (for overlay click)
    function closeSidebar() {
        sidebar.classList.add('collapsed');
        sidebar.classList.remove('show');
        body.classList.add('sidebar-collapsed');
        if (sidebarOverlay) {
            sidebarOverlay.style.display = 'none';
        }
    }
    
    // Enhanced menu selection with dynamic effects
    sidebarLinks.forEach(link => {
        // Add click animation
        link.addEventListener('click', function(e) {
            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
            
            // Store active link in sessionStorage
            sessionStorage.setItem('activeSidebarLink', this.getAttribute('href'));
        });
        
        // Add hover sound effect (optional - can be removed)
        link.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    });
    
    // Set active sidebar link based on current path
    const currentPath = window.location.pathname;
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            // Check if current path matches the link href
            if (currentPath === href || currentPath.startsWith(href + '/')) {
                link.classList.add('active');
                // Scroll to active link
                setTimeout(() => {
                    link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        }
    });
    
    // Restore active link from sessionStorage
    const savedActiveLink = sessionStorage.getItem('activeSidebarLink');
    if (savedActiveLink) {
        sidebarLinks.forEach(link => {
            if (link.getAttribute('href') === savedActiveLink) {
                link.classList.add('active');
            }
        });
    }
    
    // Set active nav link (Dashboard)
    const navLink = document.querySelector('.nav-link');
    if (navLink && navLink.getAttribute('href') === currentPath) {
        navLink.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    }
    
    // Auto-collapse sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        body.classList.add('sidebar-collapsed');
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            body.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            body.classList.remove('sidebar-collapsed');
        }
    });
});

// Utility function to show alerts
function showAlert(message, type = 'success') {
    // Remove any existing alerts first
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
        
        // Scroll to top to show alert
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            alertDiv.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                alertDiv.remove();
            }, 300);
        }, 5000);
    }
}

// Format currency
function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
