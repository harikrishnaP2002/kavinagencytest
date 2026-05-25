$(document).ready(function() {
    const modal = $('#shopModal');
    const modalBootstrap = new bootstrap.Modal(modal[0]);
    const viewModal = $('#viewShopModal');
    const form = $('#shopForm');
    let isEditMode = false;
    let currentViewShopId = null;
    
    // Load shops on page load
    loadShops();
    
    // Check database connectivity on page load
    checkDatabaseConnection();
    
    // Function to check database connectivity
    function checkDatabaseConnection() {
        $.ajax({
            url: '/shop-master/api/test-connection',
            method: 'GET',
            timeout: 5000, // 5 second timeout
            success: function(response) {
                if (response.success) {
                    $('#dbStatusIcon').removeClass('fa-circle fa-exclamation-circle fa-times-circle').addClass('fa-check-circle');
                    $('#dbStatusIcon').css('color', '#28a745');
                    $('#dbStatusText').text(`Connected (${response.data.shop_count} shops)`);
                    $('#dbStatus').css('color', '#28a745');
                } else {
                    $('#dbStatusIcon').removeClass('fa-circle fa-check-circle fa-times-circle').addClass('fa-exclamation-circle');
                    $('#dbStatusIcon').css('color', '#dc3545');
                    // Check if it's a migration issue
                    if (response.error && response.error.includes('migrations')) {
                        $('#dbStatusText').text('Tables Not Created - Run Migrations');
                    } else {
                        $('#dbStatusText').text('Connection Error');
                    }
                    $('#dbStatus').css('color', '#dc3545');
                }
            },
            error: function(xhr, status, error) {
                // Only show error if it's not a timeout or if it's a real connection issue
                if (status !== 'timeout' && xhr.status !== 0) {
                    $('#dbStatusIcon').removeClass('fa-circle fa-check-circle fa-exclamation-circle').addClass('fa-times-circle');
                    $('#dbStatusIcon').css('color', '#dc3545');
                    // Check response for migration error
                    if (xhr.responseJSON && xhr.responseJSON.error && xhr.responseJSON.error.includes('migrations')) {
                        $('#dbStatusText').text('Tables Not Created - Run Migrations');
                    } else {
                        $('#dbStatusText').text('Connection Failed');
                    }
                    $('#dbStatus').css('color', '#dc3545');
                } else {
                    // Hide on timeout/network errors
                    $('#dbStatus').hide();
                }
            }
        });
    }
    
    // Silent connection check (doesn't show errors)
    function checkDatabaseConnectionSilent() {
        $.ajax({
            url: '/shop-master/api/test-connection',
            method: 'GET',
            timeout: 3000,
            success: function(response) {
                if (response.success) {
                    $('#dbStatus').show();
                    $('#dbStatusIcon').removeClass('fa-circle fa-exclamation-circle fa-times-circle').addClass('fa-check-circle');
                    $('#dbStatusIcon').css('color', '#28a745');
                    $('#dbStatusText').text(`Connected (${response.data.shop_count} shops)`);
                    $('#dbStatus').css('color', '#28a745');
                }
            },
            error: function() {
                // Silent - hide status on error, don't show any error message
                $('#dbStatus').hide();
            }
        });
    }
    
    // Open modal for adding new shop
    $('#addShopBtn').click(function() {
        isEditMode = false;
        $('#modalTitle').text('Add Shop');
        $('#shopModalLabel').html('<i class="fas fa-store"></i> Add Shop');
        form[0].reset();
        $('#shopId').val('');
        $('#status').val('true');
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
        currentViewShopId = null;
    });
    
    // Edit from view modal
    $('#editFromViewBtn').click(function() {
        if (currentViewShopId) {
            viewModal.hide();
            setTimeout(function() {
                editShop(currentViewShopId);
            }, 300);
        }
    });
    
    // Bootstrap modal event handlers
    modal.on('hidden.bs.modal', function() {
        form[0].reset();
        $('#shopId').val('');
        isEditMode = false;
    });
    
    // Close modal when clicking outside (Bootstrap handles this automatically via backdrop)
    $(window).click(function(event) {
        if ($(event.target).is(viewModal)) {
            viewModal.hide();
            currentViewShopId = null;
        }
    });
    
    // Form submission
    form.on('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            shop_name: $('#shopName').val(),
            shop_place: $('#shopPlace').val(),
            owner_name: $('#ownerName').val(),
            phone_number: $('#phoneNumber').val(),
            is_active: $('#status').val() === 'true'
        };
        
        const shopId = $('#shopId').val();
        const url = shopId 
            ? `/shop-master/api/update/${shopId}`
            : '/shop-master/api/create';
        const method = shopId ? 'PUT' : 'POST';
        
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
                    loadShops();
                    
                    // Open view modal for newly added shop
                    if (!shopId && response.data) {
                        setTimeout(function() {
                            viewShopDetails(response.data.id);
                        }, 500);
                    }
                    
                    // Don't check connection after add - it's working fine if add succeeded
                } else {
                    const errorMsg = response.error || 'Unable to save shop. Please try again.';
                    showAlert(errorMsg, 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Unable to save shop. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    // Use server error message, but filter out connection-related errors
                    const serverError = xhr.responseJSON.error;
                    if (serverError.includes('connection') || serverError.includes('database') || serverError.includes('Database') || serverError.includes('Unable to process')) {
                        errorMsg = 'Unable to save shop. Please check your data and try again.';
                    } else {
                        errorMsg = serverError;
                    }
                } else if (xhr.status === 400) {
                    errorMsg = 'Invalid data provided. Please check your input.';
                } else if (xhr.status === 404) {
                    errorMsg = 'Resource not found. Please refresh the page.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Unable to save shop. Please try again.';
                } else if (xhr.status === 0) {
                    errorMsg = 'Unable to connect. Please check your connection and try again.';
                } else if (xhr.responseText) {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        if (errorData.error) {
                            if (errorData.error.includes('connection') || errorData.error.includes('database') || errorData.error.includes('Database') || errorData.error.includes('Unable to process')) {
                                errorMsg = 'Unable to save shop. Please try again.';
                            } else {
                                errorMsg = errorData.error;
                            }
                        }
                    } catch(e) {
                        errorMsg = 'Unable to save shop. Please try again.';
                    }
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    });
    
    // Load shops
    function loadShops() {
        $.ajax({
            url: '/shop-master/api/list',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    renderShopsTable(response.data);
                } else {
                    $('#shopTableBody').html('<tr><td colspan="7" class="text-center">No shops found</td></tr>');
                }
            },
            error: function(xhr) {
                $('#shopTableBody').html('<tr><td colspan="7" class="text-center">No shops found</td></tr>');
                // Don't check connection on load error - just show empty table
            }
        });
    }
    
    // Render shops table
    function renderShopsTable(shops) {
        if (shops.length === 0) {
            $('#shopTableBody').html('<tr><td colspan="7" class="text-center">No shops found</td></tr>');
            return;
        }
        
        const tbody = $('#shopTableBody');
        tbody.empty();
        
        shops.forEach(shop => {
            const statusOptions = shop.is_active 
                ? '<option value="true" selected>Active</option><option value="false">Inactive</option>'
                : '<option value="true">Active</option><option value="false" selected>Inactive</option>';
            
            const row = `
                <tr class="shop-row" data-id="${shop.id}">
                    <td>${shop.id}</td>
                    <td>${shop.shop_name}</td>
                    <td>${shop.shop_place || '-'}</td>
                    <td>${shop.owner_name || '-'}</td>
                    <td>${shop.phone_number || '-'}</td>
                    <td>
                        <select class="status-dropdown" data-id="${shop.id}" style="padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #ddd;">
                            ${statusOptions}
                        </select>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary edit-btn" data-id="${shop.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${shop.id}" title="Delete">
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
            const shopId = $(this).data('id');
            editShop(shopId);
        });
        
        // Bind delete button
        $('.delete-btn').click(function(e) {
            e.stopPropagation();
            const shopId = $(this).data('id');
            if (confirm('Are you sure you want to delete this shop?')) {
                deleteShop(shopId);
            }
        });
        
        // Bind status dropdown change event
        $('.status-dropdown').change(function() {
            const shopId = $(this).data('id');
            const newStatus = $(this).val() === 'true';
            updateShopStatus(shopId, newStatus);
        });
    }
    
    // Update shop status directly from dropdown
    function updateShopStatus(shopId, isActive) {
        $.ajax({
            url: `/shop-master/api/get/${shopId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const shop = response.data;
                    const updateData = {
                        shop_name: shop.shop_name,
                        shop_place: shop.shop_place,
                        owner_name: shop.owner_name,
                        phone_number: shop.phone_number,
                        is_active: isActive
                    };
                    
                    $.ajax({
                        url: `/shop-master/api/update/${shopId}`,
                        method: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify(updateData),
                        success: function(response) {
                            if (response.success) {
                                showAlert('Status updated successfully', 'success');
                                loadShops();
                                // Don't check connection - operation succeeded
                            } else {
                                showAlert(response.error || 'Error occurred', 'error');
                                loadShops(); // Reload to reset dropdown
                            }
                        },
                        error: function(xhr) {
                            let errorMsg = 'An error occurred while updating status.';
                            
                            if (xhr.responseJSON && xhr.responseJSON.error) {
                                errorMsg = xhr.responseJSON.error;
                            } else if (xhr.status === 400) {
                                errorMsg = 'Invalid data provided.';
                            } else if (xhr.status === 500) {
                                errorMsg = 'Server error occurred. Please try again.';
                            } else if (xhr.status === 0) {
                                errorMsg = 'Unable to connect. Please check your connection and try again.';
                            }
                            
                            showAlert(errorMsg, 'error');
                            loadShops(); // Reload to reset dropdown
                        }
                    });
                }
            },
            error: function() {
                showAlert('Error loading shop details', 'error');
                loadShops(); // Reload to reset dropdown
            }
        });
    }
    
    // Edit shop
    function editShop(shopId) {
        $.ajax({
            url: `/shop-master/api/get/${shopId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const shop = response.data;
                    isEditMode = true;
                    $('#modalTitle').text('Edit Shop');
                    $('#shopId').val(shop.id);
                    $('#shopName').val(shop.shop_name);
                    $('#shopPlace').val(shop.shop_place || '');
                    $('#ownerName').val(shop.owner_name || '');
                    $('#phoneNumber').val(shop.phone_number || '');
                    $('#status').val(shop.is_active ? 'true' : 'false');
                    $('#modalTitle').text('Edit Shop');
                    $('#shopModalLabel').html('<i class="fas fa-edit"></i> Edit Shop');
                    modalBootstrap.show();
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error loading shop details.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Shop not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                } else if (xhr.status === 0) {
                    errorMsg = 'Unable to connect. Please check your connection and try again.';
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
    
    // Delete shop
    function deleteShop(shopId) {
        $.ajax({
            url: `/shop-master/api/delete/${shopId}`,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    showAlert(response.message, 'success');
                    viewModal.hide();
                    loadShops();
                    // Don't check connection - operation succeeded
                } else {
                    showAlert(response.error || 'Error occurred', 'error');
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
                } else if (xhr.responseText) {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMsg = errorData.error || errorMsg;
                    } catch(e) {
                        errorMsg = xhr.responseText.substring(0, 100);
                    }
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
    
    // View shop details
    function viewShopDetails(shopId) {
        $.ajax({
            url: `/shop-master/api/get/${shopId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const shop = response.data;
                    currentViewShopId = shopId;
                    
                    // Populate view modal with enhanced display
                    $('#viewKeyno').html(`<strong>${shop.id || '-'}</strong>`);
                    $('#viewShopName').html(`<strong>${shop.shop_name || '-'}</strong>`);
                    $('#viewShopPlace').html(`<strong>${shop.shop_place || '-'}</strong>`);
                    $('#viewOwnerName').html(shop.owner_name ? `<strong>${shop.owner_name}</strong>` : '<span style="opacity: 0.5;">-</span>');
                    $('#viewPhoneNumber').html(shop.phone_number ? `<strong><a href="tel:${shop.phone_number}" style="color: var(--primary-color); text-decoration: none;">${shop.phone_number}</a></strong>` : '<span style="opacity: 0.5;">-</span>');
                    
                    // Status with enhanced badge
                    const statusHtml = shop.is_active 
                        ? '<span class="badge badge-success" style="font-size: 1rem; padding: 0.5rem 1rem;"><i class="fas fa-check-circle"></i> Active</span>'
                        : '<span class="badge badge-danger" style="font-size: 1rem; padding: 0.5rem 1rem;"><i class="fas fa-times-circle"></i> Inactive</span>';
                    $('#viewStatus').html(statusHtml);
                    
                                viewModal.show();
                } else {
                    showAlert(response.error || 'Error loading shop details', 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error loading shop details.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Shop not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                } else if (xhr.status === 0) {
                    errorMsg = 'Unable to connect. Please check your connection and try again.';
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
});
