$(document).ready(function() {
    const modal = $('#linkModal');
    const modalBootstrap = new bootstrap.Modal(modal[0]);
    const viewModal = $('#viewLinkModal');
    const form = $('#linkForm');
    let isEditMode = false;
    let currentViewLinkId = null;
    
    // Load links and dropdowns on page load
    loadShops();
    loadProducts();
    loadLinks();
    
    // Open modal for adding new link
    $('#addLinkBtn').click(function() {
        isEditMode = false;
        $('#modalTitle').text('Add Link');
        $('#linkModalLabel').html('<i class="fas fa-link"></i> Add Link');
        form[0].reset();
        $('#linkId').val('');
        $('#status').val('true');
        loadShops();
        loadProducts();
        modalBootstrap.show();
    });
    
    // Close modal
    $('#closeModal, #cancelBtn').click(function() {
        modalBootstrap.hide();
        form[0].reset();
    });
    
    // Close view modal
    $('#closeViewModal, #closeViewBtn').click(function() {
        viewModal.hide();
        currentViewLinkId = null;
    });
    
    // Edit from view modal
    $('#editFromViewBtn').click(function() {
        if (currentViewLinkId) {
            viewModal.hide();
            setTimeout(function() {
                editLink(currentViewLinkId);
            }, 300);
        }
    });
    
    // Bootstrap modal event handlers
    modal.on('hidden.bs.modal', function() {
        form[0].reset();
        $('#linkId').val('');
        isEditMode = false;
    });
    
    // Form submission
    form.on('submit', function(e) {
        e.preventDefault();
        
        const linkId = $('#linkId').val();
        const formData = {
            shop_id: parseInt($('#shopId').val()),
            product_id: parseInt($('#productId').val()),
            amount: $('#amount').val() ? parseFloat($('#amount').val()) : null,
            is_active: $('#status').val() === 'true'
        };
        
        const url = linkId 
            ? `/shop-product-link/api/update/${linkId}`
            : '/shop-product-link/api/create';
        const method = linkId ? 'PUT' : 'POST';
        
        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    showAlert(response.message, 'success');
                    modalBootstrap.hide();
                    form[0].reset();
                    loadLinks();
                    
                    // Open view modal for newly added link
                    if (!linkId && response.data) {
                        setTimeout(function() {
                            viewLinkDetails(response.data.id);
                        }, 500);
                    }
                } else {
                    const errorMsg = response.error || 'An error occurred. Please try again.';
                    showAlert(errorMsg, 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'An error occurred. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 400) {
                    errorMsg = 'Invalid data provided. Please check your input.';
                } else if (xhr.status === 404) {
                    errorMsg = 'Resource not found. Please refresh the page.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please contact administrator.';
                } else if (xhr.status === 0) {
                    errorMsg = 'Network error. Please check your connection.';
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    });
    
    // Load shops for dropdown
    function loadShops() {
        $.ajax({
            url: '/shop-product-link/api/shops',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const select = $('#shopId');
                    const currentValue = select.val();
                    select.empty().append('<option value="">Select Shop</option>');
                    response.data.forEach(shop => {
                        select.append(`<option value="${shop.id}">${shop.name}</option>`);
                    });
                    if (currentValue) select.val(currentValue);
                }
            }
        });
    }
    
    // Load products for dropdown
    function loadProducts() {
        $.ajax({
            url: '/shop-product-link/api/products',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const select = $('#productId');
                    const currentValue = select.val();
                    select.empty().append('<option value="">Select Product</option>');
                    response.data.forEach(product => {
                        select.append(`<option value="${product.id}">${product.name}</option>`);
                    });
                    if (currentValue) select.val(currentValue);
                }
            }
        });
    }
    
    // Load links
    function loadLinks() {
        $.ajax({
            url: '/shop-product-link/api/list',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    renderLinksTable(response.data);
                }
            },
            error: function(xhr) {
                $('#linkTableBody').html('<tr><td colspan="6" class="text-center"></td></tr>');
            }
        });
    }
    
    // Render links table
    function renderLinksTable(links) {
        if (links.length === 0) {
            $('#linkTableBody').html('<tr><td colspan="6" class="text-center">No links found</td></tr>');
            return;
        }
        
        const tbody = $('#linkTableBody');
        tbody.empty();
        
        links.forEach(link => {
            const statusOptions = link.is_active 
                ? '<option value="true" selected>Active</option><option value="false">Inactive</option>'
                : '<option value="true">Active</option><option value="false" selected>Inactive</option>';
            
            const row = `
                <tr class="link-row" data-id="${link.id}">
                    <td>${link.id}</td>
                    <td>${link.shop_name || '-'}</td>
                    <td>${link.product_name || '-'}</td>
                    <td>${link.amount ? parseFloat(link.amount).toFixed(2) : '-'}</td>
                    <td>
                        <select class="status-dropdown" data-id="${link.id}" style="padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #ddd;">
                            ${statusOptions}
                        </select>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary edit-btn" data-id="${link.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${link.id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
        
        // Bind edit button
        $('.edit-btn').click(function(e) {
            e.stopPropagation();
            const linkId = $(this).data('id');
            editLink(linkId);
        });
        
        // Bind delete button
        $('.delete-btn').click(function(e) {
            e.stopPropagation();
            const linkId = $(this).data('id');
            if (confirm('Are you sure you want to delete this link?')) {
                deleteLink(linkId);
            }
        });
        
        // Bind status dropdown change event
        $('.status-dropdown').change(function() {
            const linkId = $(this).data('id');
            const newStatus = $(this).val() === 'true';
            updateLinkStatus(linkId, newStatus);
        });
    }
    
    // Update link status directly from dropdown
    function updateLinkStatus(linkId, isActive) {
        $.ajax({
            url: `/shop-product-link/api/get/${linkId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const link = response.data;
                    const updateData = {
                        shop_id: link.shop_id,
                        product_id: link.product_id,
                        amount: link.amount,
                        is_active: isActive
                    };
                    
                    $.ajax({
                        url: `/shop-product-link/api/update/${linkId}`,
                        method: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify(updateData),
                        success: function(response) {
                            if (response.success) {
                                showAlert('Status updated successfully', 'success');
                                loadLinks();
                            } else {
                                showAlert(response.error || 'Error occurred', 'error');
                                loadLinks(); // Reload to reset dropdown
                            }
                        },
                        error: function(xhr) {
                            let errorMsg = 'An error occurred while updating status.';
                            
                            if (xhr.responseJSON && xhr.responseJSON.error) {
                                errorMsg = xhr.responseJSON.error;
                            }
                            
                            showAlert(errorMsg, 'error');
                            loadLinks(); // Reload to reset dropdown
                        }
                    });
                }
            },
            error: function() {
                showAlert('Error loading link details', 'error');
                loadLinks(); // Reload to reset dropdown
            }
        });
    }
    
    // Edit link
    function editLink(linkId) {
        $.ajax({
            url: `/shop-product-link/api/get/${linkId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const link = response.data;
                    isEditMode = true;
                    $('#modalTitle').text('Edit Link');
                    $('#linkModalLabel').html('<i class="fas fa-edit"></i> Edit Link');
                    $('#linkId').val(link.id);
                    loadShops();
                    loadProducts();
                    setTimeout(() => {
                        $('#shopId').val(link.shop_id);
                        $('#productId').val(link.product_id);
                        $('#amount').val(link.amount || '');
                        $('#status').val(link.is_active ? 'true' : 'false');
                    }, 100);
                    modalBootstrap.show();
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error loading link details.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Link not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
    
    // Delete link
    function deleteLink(linkId) {
        $.ajax({
            url: `/shop-product-link/api/delete/${linkId}`,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    showAlert(response.message, 'success');
                    viewModal.hide();
                    loadLinks();
                } else {
                    showAlert(response.error || 'Error occurred', 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'An error occurred while deleting link.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Link not found.';
                } else if (xhr.status === 400) {
                    errorMsg = 'Cannot delete link due to existing references.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
    
    // View link details
    function viewLinkDetails(linkId) {
        $.ajax({
            url: `/shop-product-link/api/get/${linkId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const link = response.data;
                    currentViewLinkId = linkId;
                    
                    // Populate view modal
                    $('#viewLinkId').html(`<strong>${link.id || '-'}</strong>`);
                    $('#viewShopName').html(`<strong>${link.shop_name || '-'}</strong>`);
                    $('#viewProductName').html(`<strong>${link.product_name || '-'}</strong>`);
                    $('#viewAmount').html(link.amount ? `<strong>${parseFloat(link.amount).toFixed(2)}</strong>` : '<span style="opacity: 0.5;">-</span>');
                    
                    // Status with enhanced badge
                    const statusHtml = link.is_active 
                        ? '<span class="badge badge-success" style="font-size: 1rem; padding: 0.5rem 1rem;"><i class="fas fa-check-circle"></i> Active</span>'
                        : '<span class="badge badge-danger" style="font-size: 1rem; padding: 0.5rem 1rem;"><i class="fas fa-times-circle"></i> Inactive</span>';
                    $('#viewStatus').html(statusHtml);
                    
                    viewModal.show();
                } else {
                    showAlert(response.error || 'Error loading link details', 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error loading link details.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Link not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
});
