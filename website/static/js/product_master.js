$(document).ready(function() {
    const modal = $('#productModal');
    const modalBootstrap = new bootstrap.Modal(modal[0]);
    const viewModal = $('#viewProductModal');
    const form = $('#productForm');
    let isEditMode = false;
    let currentViewProductId = null;
    
    // Load products on page load
    loadProducts();
    
    // Check database connectivity on page load
    checkDatabaseConnection();
    
    // Function to check database connectivity
    function checkDatabaseConnection() {
        $.ajax({
            url: '/product-master/api/test-connection',
            method: 'GET',
            timeout: 5000, // 5 second timeout
            success: function(response) {
                if (response.success) {
                    $('#dbStatusIcon').removeClass('fa-circle fa-exclamation-circle fa-times-circle').addClass('fa-check-circle');
                    $('#dbStatusIcon').css('color', '#28a745');
                    $('#dbStatusText').text(`Connected (${response.data.product_count} products)`);
                    $('#dbStatus').css('color', '#28a745');
                } else {
                    $('#dbStatusIcon').removeClass('fa-circle fa-check-circle fa-times-circle').addClass('fa-exclamation-circle');
                    $('#dbStatusIcon').css('color', '#dc3545');
                    $('#dbStatusText').text('Connection Error');
                    $('#dbStatus').css('color', '#dc3545');
                }
            },
            error: function(xhr, status, error) {
                // Only show error if it's not a timeout or if it's a real connection issue
                if (status !== 'timeout' && xhr.status !== 0) {
                    $('#dbStatusIcon').removeClass('fa-circle fa-check-circle fa-exclamation-circle').addClass('fa-times-circle');
                    $('#dbStatusIcon').css('color', '#dc3545');
                    $('#dbStatusText').text('Connection Failed');
                    $('#dbStatus').css('color', '#dc3545');
                }
            }
        });
    }
    
    // Silent connection check (doesn't show errors)
    function checkDatabaseConnectionSilent() {
        $.ajax({
            url: '/product-master/api/test-connection',
            method: 'GET',
            timeout: 3000,
            success: function(response) {
                if (response.success) {
                    $('#dbStatusIcon').removeClass('fa-circle fa-exclamation-circle fa-times-circle').addClass('fa-check-circle');
                    $('#dbStatusIcon').css('color', '#28a745');
                    $('#dbStatusText').text(`Connected (${response.data.product_count} products)`);
                    $('#dbStatus').css('color', '#28a745');
                }
            },
            error: function() {
                // Silent - don't update status on error
            }
        });
    }
    
    // Open modal for adding new product
    $('#addProductBtn').click(function() {
        isEditMode = false;
        $('#modalTitle').text('Add Product');
        $('#productModalLabel').html('<i class="fas fa-box"></i> Add Product');
        form[0].reset();
        $('#productId').val('');
        $('#unitOfMeasure').val('PCS');
        $('#isActive').prop('checked', true);
        modalBootstrap.show();
    });
    
    // Close modal
    $('#closeModal, #cancelBtn').click(function() {
        modalBootstrap.hide();
        form[0].reset();
    });
    
    // Close view modal
    $('#closeViewProductModal, #closeViewProductBtn').click(function() {
        viewModal.hide();
        currentViewProductId = null;
    });
    
    // Edit from view modal
    $('#editProductFromViewBtn').click(function() {
        if (currentViewProductId) {
            viewModal.hide();
            setTimeout(function() {
                editProduct(currentViewProductId);
            }, 300);
        }
    });
    
    // Bootstrap modal event handlers
    modal.on('hidden.bs.modal', function() {
        form[0].reset();
        $('#productId').val('');
        isEditMode = false;
    });
    
    // Close modal when clicking outside (Bootstrap handles this automatically via backdrop)
    $(window).click(function(event) {
        if ($(event.target).is(viewModal)) {
            viewModal.hide();
            currentViewProductId = null;
        }
    });
    
    // Form submission
    form.on('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            product_name: $('#productName').val(),
            product_code: $('#productCode').val(),
            product_description: $('#productDescription').val(),
            product_category: $('#productCategory').val(),
            unit_of_measure: $('#unitOfMeasure').val(),
            is_active: $('#isActive').is(':checked')
        };
        
        const productId = $('#productId').val();
        const url = productId 
            ? `/product-master/api/update/${productId}`
            : '/product-master/api/create';
        const method = productId ? 'PUT' : 'POST';
        
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
                    loadProducts();
                    
                    // Open view modal for newly added product
                    if (!productId && response.data) {
                        setTimeout(function() {
                            viewProductDetails(response.data.id);
                        }, 500);
                    }
                    
                    // Silently update database status without showing errors
                    setTimeout(function() {
                        checkDatabaseConnectionSilent();
                    }, 1500);
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
                    errorMsg = 'Database connection lost. Please refresh the page.';
                    checkDatabaseConnectionSilent();
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
    });
    
    // Load products
    function loadProducts() {
        $.ajax({
            url: '/product-master/api/list',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    renderProductsTable(response.data);
                }
            },
            error: function(xhr) {
                $('#productTableBody').html('<tr><td colspan="8" class="text-center"></td></tr>');
                if (xhr.status === 0) {
                    checkDatabaseConnectionSilent();
                }
            }
        });
    }
    
    // Render products table
    function renderProductsTable(products) {
        if (products.length === 0) {
            $('#productTableBody').html('<tr><td colspan="4" class="text-center">No products found</td></tr>');
            return;
        }
        
        const tbody = $('#productTableBody');
        tbody.empty();
        
        products.forEach(product => {
            const statusOptions = product.is_active 
                ? '<option value="true" selected>Active</option><option value="false">Inactive</option>'
                : '<option value="true">Active</option><option value="false" selected>Inactive</option>';
            
            const row = `
                <tr class="product-row" data-id="${product.id}">
                    <td>${product.id}</td>
                    <td>${product.product_name}</td>
                    <td>
                        <select class="status-dropdown" data-id="${product.id}" style="padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #ddd;">
                            ${statusOptions}
                        </select>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary edit-btn" data-id="${product.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${product.id}" title="Delete">
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
            const productId = $(this).data('id');
            editProduct(productId);
        });
        
        // Bind delete button
        $('.delete-btn').click(function(e) {
            e.stopPropagation();
            const productId = $(this).data('id');
            if (confirm('Are you sure you want to delete this product?')) {
                deleteProduct(productId);
            }
        });
        
        // Bind status dropdown change event
        $('.status-dropdown').change(function() {
            const productId = $(this).data('id');
            const newStatus = $(this).val() === 'true';
            updateProductStatus(productId, newStatus);
        });
    }
    
    // Update product status directly from dropdown
    function updateProductStatus(productId, isActive) {
        $.ajax({
            url: `/product-master/api/get/${productId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const product = response.data;
                    const updateData = {
                        product_name: product.product_name,
                        product_code: product.product_code,
                        product_description: product.product_description,
                        product_category: product.product_category,
                        unit_of_measure: product.unit_of_measure,
                        is_active: isActive
                    };
                    
                    $.ajax({
                        url: `/product-master/api/update/${productId}`,
                        method: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify(updateData),
                        success: function(response) {
                            if (response.success) {
                                showAlert('Status updated successfully', 'success');
                                loadProducts();
                                checkDatabaseConnectionSilent();
                            } else {
                                showAlert(response.error || 'Error occurred', 'error');
                                loadProducts(); // Reload to reset dropdown
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
                                errorMsg = 'Database connection lost. Please refresh the page.';
                                checkDatabaseConnectionSilent();
                            }
                            
                            showAlert(errorMsg, 'error');
                            loadProducts(); // Reload to reset dropdown
                        }
                    });
                }
            },
            error: function() {
                showAlert('Error loading product details', 'error');
                loadProducts(); // Reload to reset dropdown
            }
        });
    }
    
    // View product details
    function viewProductDetails(productId) {
        $.ajax({
            url: `/product-master/api/get/${productId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const product = response.data;
                    currentViewProductId = productId;
                    
                    // Populate view modal with enhanced display
                    $('#viewProductId').html(`<strong>${product.id || '-'}</strong>`);
                    $('#viewProductName').html(`<strong>${product.product_name || '-'}</strong>`);
                    $('#viewProductCode').html(product.product_code ? `<strong>${product.product_code}</strong>` : '<span style="opacity: 0.5;">-</span>');
                    $('#viewProductCategory').html(product.product_category ? `<strong>${product.product_category}</strong>` : '<span style="opacity: 0.5;">-</span>');
                    $('#viewUnitOfMeasure').html(`<strong>${product.unit_of_measure || '-'}</strong>`);
                    $('#viewProductDescription').html(product.product_description ? `<strong>${product.product_description}</strong>` : '<span style="opacity: 0.5;">-</span>');
                    
                    // Status with enhanced badge
                    const statusHtml = product.is_active 
                        ? '<span class="badge badge-success" style="font-size: 1rem; padding: 0.5rem 1rem;"><i class="fas fa-check-circle"></i> Active</span>'
                        : '<span class="badge badge-danger" style="font-size: 1rem; padding: 0.5rem 1rem;"><i class="fas fa-times-circle"></i> Inactive</span>';
                    $('#viewProductStatus').html(statusHtml);
                    
                    viewModal.show();
                } else {
                    showAlert(response.error || 'Error loading product details', 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error loading product details.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Product not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                } else if (xhr.status === 0) {
                    errorMsg = 'Database connection lost. Please refresh the page.';
                    checkDatabaseConnectionSilent();
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
    
    // Edit product
    function editProduct(productId) {
        $.ajax({
            url: `/product-master/api/get/${productId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const product = response.data;
                    isEditMode = true;
                    $('#modalTitle').text('Edit Product');
                    $('#productId').val(product.id);
                    $('#productName').val(product.product_name);
                    $('#productCode').val(product.product_code || '');
                    $('#productDescription').val(product.product_description || '');
                    $('#productCategory').val(product.product_category || '');
                    $('#unitOfMeasure').val(product.unit_of_measure);
                    $('#isActive').prop('checked', product.is_active);
                    $('#modalTitle').text('Edit Product');
                    $('#productModalLabel').html('<i class="fas fa-edit"></i> Edit Product');
                    modalBootstrap.show();
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error loading product details.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Product not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                } else if (xhr.status === 0) {
                    errorMsg = 'Database connection lost. Please refresh the page.';
                    checkDatabaseConnectionSilent();
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
    
    // Delete product
    function deleteProduct(productId) {
        $.ajax({
            url: `/product-master/api/delete/${productId}`,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    showAlert(response.message, 'success');
                    viewModal.hide();
                    loadProducts();
                    checkDatabaseConnectionSilent();
                } else {
                    showAlert(response.error || 'Error occurred', 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'An error occurred while deleting product.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Product not found.';
                } else if (xhr.status === 400) {
                    errorMsg = 'Cannot delete product due to existing references.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error occurred. Please try again.';
                } else if (xhr.status === 0) {
                    errorMsg = 'Database connection lost. Please refresh the page.';
                    checkDatabaseConnectionSilent();
                }
                
                showAlert(errorMsg, 'error');
            }
        });
    }
});
