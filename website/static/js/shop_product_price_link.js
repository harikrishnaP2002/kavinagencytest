$(document).ready(function() {
    const modal = $('#saleModal');
    const modalBootstrap = new bootstrap.Modal(modal[0]);
    const viewModal = $('#viewSaleModal');
    const form = $('#saleForm');
    let isEditMode = false;
    let currentViewSaleId = null;
    let linkedProducts = [];

    const today = new Date().toISOString().split('T')[0];
    $('#saleDate').val(today);
    $('#batchSaleDate').val(today);

    loadShops();
    loadProducts();
    loadSales();
    initBatchLines();

    $('#saleTableBody').on('click', '.sale-row', function(e) {
        if ($(e.target).closest('button, .action-buttons').length) return;
        viewSaleDetails($(this).data('id'));
    });

    $('#saleTableBody').on('click', '.edit-btn', function(e) {
        e.stopPropagation();
        editSale($(this).data('id'));
    });

    $('#saleTableBody').on('click', '.delete-btn', function(e) {
        e.stopPropagation();
        const saleId = $(this).data('id');
        if (confirm('Are you sure you want to delete this sale record?')) {
            deleteSale(saleId);
        }
    });

    function setModalMode(edit) {
        isEditMode = edit;
        if (edit) {
            modal.addClass('single-edit-active');
            $('#modalTitle').text('Edit sale');
            $('#saleModalLabel').html('<i class="fas fa-edit"></i> Edit sale');
            $('#saleSubmitLabel').text('Save');
        } else {
            modal.removeClass('single-edit-active');
            $('#modalTitle').text('Record sales');
            $('#saleModalLabel').html('<i class="fas fa-dollar-sign"></i> Record sales');
            $('#saleSubmitLabel').text('Save all');
        }
    }

    $('#shopId, #productId').on('change', function() {
        const shopId = $('#shopId').val();
        const productId = $('#productId').val();
        if (shopId && productId) {
            fetchAmount(shopId, productId);
        } else {
            $('#amount').val('');
            $('#totalAmount').val('');
        }
    });

    $('#quantitySold').on('input', function() {
        calculateTotalAmount();
    });

    function fetchAmount(shopId, productId) {
        $.ajax({
            url: `/shop-product-price-link/api/get-amount/${shopId}/${productId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    $('#amount').val(response.amount.toFixed(2));
                    calculateTotalAmount();
                } else {
                    $('#amount').val('');
                    $('#totalAmount').val('');
                    if (response.error) {
                        showAlert(response.error, 'error');
                    }
                }
            },
            error: function() {
                $('#amount').val('');
                $('#totalAmount').val('');
            }
        });
    }

    function calculateTotalAmount() {
        const amount = parseFloat($('#amount').val()) || 0;
        const quantity = parseInt($('#quantitySold').val(), 10) || 0;
        const total = amount * quantity;
        $('#totalAmount').val(total.toFixed(2));
    }

    function productOptionsHtml() {
        let html = '<option value="">Choose…</option>';
        if (!linkedProducts.length) {
            return html;
        }
        linkedProducts.forEach(function(p) {
            html += `<option value="${p.id}" data-amount="${p.amount}">${escapeHtml(p.name)}</option>`;
        });
        return html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function syncSelectTitle(selectEl) {
        if (!selectEl) return;
        const opt = selectEl.options && selectEl.selectedIndex >= 0 ? selectEl.options[selectEl.selectedIndex] : null;
        const label = opt ? (opt.text || '').trim() : '';
        selectEl.title = label && label !== 'Choose…' ? label : '';
    }

    function initBatchLines() {
        $('#batchLinesBody').empty();
        addBatchLine();
        recalcBatchGrandTotal();
    }

    function addBatchLine() {
        const row = $(`
            <tr class="batch-line-row">
                <td class="batch-col-product">
                    <select class="form-select batch-product-select">${productOptionsHtml()}</select>
                </td>
                <td class="batch-col-qty">
                    <input type="number" min="0" step="1" class="form-control form-control-sm batch-qty" placeholder="Qty" autocomplete="off" inputmode="numeric" title="Required when an item row is chosen">
                </td>
                <td class="batch-col-price batch-unit-price text-end">—</td>
                <td class="batch-col-line batch-line-total text-end">0.00</td>
                <td class="batch-col-remove text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger btn-remove-batch-line" title="Remove row">&times;</button>
                </td>
            </tr>
        `);
        $('#batchLinesBody').append(row);
        refreshBatchProductSelects();
        row.find('.batch-qty').prop('required', false).removeAttr('aria-required');
        row.removeClass('batch-row-product-selected');
        recalcBatchRow(row);
    }

    function refreshBatchProductSelects() {
        const opts = productOptionsHtml();
        $('#batchLinesBody .batch-line-row').each(function() {
            const $row = $(this);
            const $sel = $row.find('.batch-product-select');
            const v = $sel.val();
            $sel.html(opts);
            if (v && $sel.find(`option[value="${v}"]`).length) {
                $sel.val(v);
            }
            syncSelectTitle($sel[0]);
            const $qty = $row.find('.batch-qty');
            if ($sel.val()) {
                $qty.prop('required', true).attr('aria-required', 'true');
                $row.addClass('batch-row-product-selected');
            } else {
                $qty.prop('required', false).removeAttr('aria-required');
                $row.removeClass('batch-row-product-selected');
            }
        });
    }

    function recalcBatchRow($row) {
        const $sel = $row.find('.batch-product-select');
        const opt = $sel.find('option:selected');
        const unit = parseFloat(opt.data('amount'));
        const hasUnit = opt.val() && !isNaN(unit);
        const qty = parseInt($row.find('.batch-qty').val(), 10) || 0;
        $row.find('.batch-unit-price').text(hasUnit ? unit.toFixed(2) : '—');
        const line = hasUnit && qty > 0 ? unit * qty : 0;
        $row.find('.batch-line-total').text(
            line > 0
                ? line.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00'
        );
    }

    function recalcBatchGrandTotal() {
        let sum = 0;
        $('#batchLinesBody .batch-line-row').each(function() {
            const $row = $(this);
            const $sel = $row.find('.batch-product-select');
            const opt = $sel.find('option:selected');
            const unit = parseFloat(opt.data('amount'));
            const qty = parseInt($row.find('.batch-qty').val(), 10) || 0;
            if (opt.val() && !isNaN(unit) && qty > 0) {
                sum += unit * qty;
            }
        });
        $('#batchGrandTotal').text(
            sum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        );
    }

    function loadLinkedProductsForBatch(shopId, done) {
        if (!shopId) {
            linkedProducts = [];
            refreshBatchProductSelects();
            $('#batchLinesBody .batch-line-row').each(function() {
                recalcBatchRow($(this));
            });
            recalcBatchGrandTotal();
            if (typeof done === 'function') done();
            return;
        }
        $.ajax({
            url: `/shop-product-price-link/api/linked-products/${shopId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    linkedProducts = response.data || [];
                } else {
                    linkedProducts = [];
                    showAlert(response.error || 'Could not load products for shop', 'error');
                }
                refreshBatchProductSelects();
                $('#batchLinesBody .batch-line-row').each(function() {
                    recalcBatchRow($(this));
                });
                recalcBatchGrandTotal();
                if (typeof done === 'function') done();
            },
            error: function() {
                linkedProducts = [];
                refreshBatchProductSelects();
                recalcBatchGrandTotal();
                showAlert('Could not load products for this shop', 'error');
                if (typeof done === 'function') done();
            }
        });
    }

    $('#batchShopId').on('change', function() {
        const shopId = $(this).val();
        loadLinkedProductsForBatch(shopId);
    });

    $('#batchLinesBody').on('change', '.batch-product-select', function() {
        const $row = $(this).closest('tr');
        const $qty = $row.find('.batch-qty');
        if (!$(this).val()) {
            $qty.prop('required', false);
            $qty.removeAttr('aria-required');
            $row.removeClass('batch-row-product-selected');
        } else {
            $qty.prop('required', true);
            $qty.attr('aria-required', 'true');
            $row.addClass('batch-row-product-selected');
        }
        syncSelectTitle(this);
        recalcBatchRow($row);
        recalcBatchGrandTotal();
    });

    $('#batchLinesBody').on('input', '.batch-qty', function() {
        const $row = $(this).closest('tr');
        recalcBatchRow($row);
        recalcBatchGrandTotal();
    });

    $('#batchLinesBody').on('click', '.btn-remove-batch-line', function() {
        const $rows = $('#batchLinesBody .batch-line-row');
        if ($rows.length <= 1) {
            const $row = $rows.first();
            $row.find('.batch-product-select').val('');
            $row.find('.batch-qty').val('');
            recalcBatchRow($row);
            recalcBatchGrandTotal();
            return;
        }
        $(this).closest('tr').remove();
        recalcBatchGrandTotal();
    });

    $('#addBatchLineBtn').on('click', function() {
        addBatchLine();
        recalcBatchGrandTotal();
    });

    $('#addSaleBtn').click(function() {
        setModalMode(false);
        form[0].reset();
        $('#saleId').val('');
        $('#saleDate').val(today);
        $('#batchSaleDate').val(today);
        $('#amount').val('');
        $('#quantitySold').val('');
        $('#totalAmount').val('');
        $('#batchNotes').val('');
        loadShops();
        loadProducts();
        initBatchLines();
        loadLinkedProductsForBatch($('#batchShopId').val());
        modalBootstrap.show();
    });

    $('#closeModal, #cancelBtn').click(function() {
        modalBootstrap.hide();
        form[0].reset();
        $('#saleDate').val(today);
        $('#batchSaleDate').val(today);
    });

    $('#closeViewModal, #closeViewBtn').click(function() {
        viewModal.hide();
        currentViewSaleId = null;
    });

    $('#editFromViewBtn').click(function() {
        if (currentViewSaleId) {
            viewModal.hide();
            setTimeout(function() {
                editSale(currentViewSaleId);
            }, 300);
        }
    });

    modal.on('hidden.bs.modal', function() {
        form[0].reset();
        $('#saleId').val('');
        $('#saleDate').val(today);
        $('#batchSaleDate').val(today);
        $('#amount').val('');
        $('#quantitySold').val('');
        $('#totalAmount').val('');
        setModalMode(false);
        initBatchLines();
    });

    form.on('submit', function(e) {
        e.preventDefault();
        const saleId = $('#saleId').val();

        if (isEditMode && saleId) {
            const formData = {
                shop_id: parseInt($('#shopId').val(), 10),
                product_id: parseInt($('#productId').val(), 10),
                quantity_sold: parseInt($('#quantitySold').val(), 10),
                sale_date: $('#saleDate').val(),
                notes: $('#notes').val() || ''
            };
            if (!formData.shop_id || !formData.product_id || !formData.quantity_sold) {
                showAlert('Please fill shop, product, and quantity.', 'error');
                return;
            }
            $.ajax({
                url: `/shop-product-price-link/api/update/${saleId}`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                success: function(response) {
                    if (response.success) {
                        showAlert(response.message, 'success');
                        modalBootstrap.hide();
                        loadSales();
                    } else {
                        showAlert(response.error || 'An error occurred.', 'error');
                    }
                },
                error: handleSubmitError
            });
            return;
        }

        const batchShopId = $('#batchShopId').val();
        const batchDate = $('#batchSaleDate').val();
        if (!batchShopId) {
            showAlert('Please select a shop.', 'error');
            return;
        }
        if (!batchDate) {
            showAlert('Please select a sale date.', 'error');
            return;
        }

        const lines = [];
        let qtyWithoutProduct = false;
        let productWithoutQty = false;
        $('#batchLinesBody .batch-line-row').each(function() {
            const $row = $(this);
            const pid = $row.find('.batch-product-select').val();
            const rawQty = $row.find('.batch-qty').val();
            const qty = rawQty === '' || rawQty === undefined ? NaN : parseInt(rawQty, 10);
            if (!pid && !isNaN(qty) && qty > 0) {
                qtyWithoutProduct = true;
            }
            if (pid && (isNaN(qty) || qty <= 0)) {
                productWithoutQty = true;
            }
            if (pid && !isNaN(qty) && qty > 0) {
                lines.push({ product_id: parseInt(pid, 10), quantity_sold: qty });
            }
        });

        if (qtyWithoutProduct) {
            showAlert('Choose a product for each row that has a quantity.', 'error');
            return;
        }
        if (productWithoutQty) {
            showAlert('Enter a quantity greater than zero for each selected product.', 'error');
            return;
        }
        if (!lines.length) {
            showAlert('Add at least one product with quantity.', 'error');
            return;
        }

        $.ajax({
            url: '/shop-product-price-link/api/create-batch',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                shop_id: parseInt(batchShopId, 10),
                sale_date: batchDate,
                notes: ($('#batchNotes').val() || '').trim(),
                lines: lines
            }),
            success: function(response) {
                if (response.success) {
                    const msg =
                        response.message +
                        (response.grand_total != null
                            ? ` · Grand total ${Number(response.grand_total).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                              })}`
                            : '');
                    showAlert(msg, 'success');
                    modalBootstrap.hide();
                    loadSales();
                } else {
                    showAlert(response.error || 'An error occurred.', 'error');
                }
            },
            error: handleSubmitError
        });
    });

    function handleSubmitError(xhr) {
        let errorMsg = 'An error occurred. Please try again.';
        if (xhr.responseJSON && xhr.responseJSON.error) {
            errorMsg = xhr.responseJSON.error;
        } else if (xhr.status === 400) {
            errorMsg = 'Invalid data. Please check your input.';
        } else if (xhr.status === 404) {
            errorMsg = 'Resource not found. Please refresh the page.';
        } else if (xhr.status === 500) {
            errorMsg = 'Server error. Please try again.';
        } else if (xhr.status === 0) {
            errorMsg = 'Network error. Check your connection.';
        }
        showAlert(errorMsg, 'error');
    }

    function loadShops(done) {
        $.ajax({
            url: '/shop-product-price-link/api/shops',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const shops = response.data;
                    fillShopSelect($('#shopId'), shops);
                    fillShopSelect($('#batchShopId'), shops);
                }
                if (typeof done === 'function') done();
            },
            error: function() {
                if (typeof done === 'function') done();
            }
        });
    }

    function fillShopSelect($select, shops) {
        const cur = $select.val();
        $select.empty().append('<option value="">Select shop</option>');
        shops.forEach(function(shop) {
            $select.append(`<option value="${shop.id}">${escapeHtml(shop.name)}</option>`);
        });
        if (cur && $select.find(`option[value="${cur}"]`).length) {
            $select.val(cur);
        }
    }

    function loadProducts(done) {
        $.ajax({
            url: '/shop-product-price-link/api/products',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const select = $('#productId');
                    const currentValue = select.val();
                    select.empty().append('<option value="">Choose…</option>');
                    response.data.forEach(function(product) {
                        select.append(`<option value="${product.id}">${escapeHtml(product.name)}</option>`);
                    });
                    if (currentValue) select.val(currentValue);
                }
                if (typeof done === 'function') done();
            },
            error: function() {
                if (typeof done === 'function') done();
            }
        });
    }

    function loadSales() {
        $.ajax({
            url: '/shop-product-price-link/api/list',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    renderSalesTable(response.data);
                }
            },
            error: function() {
                $('#saleTableBody').html('<tr><td colspan="8" class="text-center"></td></tr>');
            }
        });
    }

    function renderSalesTable(sales) {
        if (sales.length === 0) {
            $('#saleTableBody').html('<tr><td colspan="8" class="text-center">No sales records found</td></tr>');
            return;
        }

        const tbody = $('#saleTableBody');
        tbody.empty();

        sales.forEach(function(sale) {
            const shopName = sale.shop_name || '-';
            const productName = sale.product_name || '-';
            const shopTitle = shopName && shopName !== '-' ? ` title="${escapeHtml(shopName)}"` : '';
            const productTitle = productName && productName !== '-' ? ` title="${escapeHtml(productName)}"` : '';
            const row =
                '<tr class="sale-row" data-id="' +
                sale.id +
                '">' +
                '<td>' +
                sale.id +
                '</td>' +
                '<td>' +
                formatDate(sale.sale_date) +
                '</td>' +
                '<td' +
                shopTitle +
                '>' +
                escapeHtml(shopName) +
                '</td>' +
                '<td' +
                productTitle +
                '>' +
                escapeHtml(productName) +
                '</td>' +
                '<td>' +
                parseFloat(sale.price).toFixed(2) +
                '</td>' +
                '<td>' +
                sale.quantity_sold +
                '</td>' +
                '<td><strong>' +
                parseFloat(sale.total_amount).toFixed(2) +
                '</strong></td>' +
                '<td>' +
                '<div class="action-buttons">' +
                '<button class="btn btn-sm btn-primary edit-btn" data-id="' +
                sale.id +
                '" title="Edit">' +
                '<i class="fas fa-edit"></i>' +
                '</button>' +
                '<button class="btn btn-sm btn-danger delete-btn" data-id="' +
                sale.id +
                '" title="Delete">' +
                '<i class="fas fa-trash"></i>' +
                '</button>' +
                '</div>' +
                '</td>' +
                '</tr>';
            tbody.append(row);
        });
    }

    function editSale(saleId) {
        $.ajax({
            url: `/shop-product-price-link/api/get/${saleId}`,
            method: 'GET',
            success: function(response) {
                if (!response.success) {
                    showAlert(response.error || 'Error loading sale details.', 'error');
                    return;
                }
                const sale = response.data;
                setModalMode(true);
                $('#saleId').val(sale.id);

                let shopsReady = false;
                let productsReady = false;

                function applySaleToEditForm() {
                    if (!shopsReady || !productsReady) return;
                    $('#shopId').val(String(sale.shop_id));
                    $('#productId').val(String(sale.product_id));
                    $('#saleDate').val(sale.sale_date || '');
                    $('#amount').val(parseFloat(sale.price).toFixed(2));
                    $('#quantitySold').val(sale.quantity_sold);
                    $('#totalAmount').val(parseFloat(sale.total_amount).toFixed(2));
                    $('#notes').val(sale.notes || '');
                    modalBootstrap.show();
                }

                loadShops(function() {
                    shopsReady = true;
                    applySaleToEditForm();
                });
                loadProducts(function() {
                    productsReady = true;
                    applySaleToEditForm();
                });
            },
            error: function(xhr) {
                let errorMsg = 'Error loading sale details.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Sale record not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error. Please try again.';
                }
                showAlert(errorMsg, 'error');
            }
        });
    }

    function deleteSale(saleId) {
        $.ajax({
            url: `/shop-product-price-link/api/delete/${saleId}`,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    showAlert(response.message, 'success');
                    viewModal.hide();
                    loadSales();
                } else {
                    showAlert(response.error || 'Error occurred', 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'An error occurred while deleting.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Sale record not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error. Please try again.';
                }
                showAlert(errorMsg, 'error');
            }
        });
    }

    function viewSaleDetails(saleId) {
        $.ajax({
            url: `/shop-product-price-link/api/get/${saleId}`,
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    const sale = response.data;
                    currentViewSaleId = saleId;
                    $('#viewSaleId').html('<strong>' + (sale.id || '-') + '</strong>');
                    $('#viewShopName').html('<strong>' + (sale.shop_name || '-') + '</strong>');
                    $('#viewProductName').html('<strong>' + (sale.product_name || '-') + '</strong>');
                    $('#viewSaleDate').html('<strong>' + formatDate(sale.sale_date) + '</strong>');
                    $('#viewAmount').html('<strong>' + parseFloat(sale.price).toFixed(2) + '</strong>');
                    $('#viewQuantity').html('<strong>' + sale.quantity_sold + '</strong>');
                    $('#viewTotalAmount').html('<strong>' + parseFloat(sale.total_amount).toFixed(2) + '</strong>');
                    $('#viewNotes').html(
                        sale.notes ? '<strong>' + escapeHtml(sale.notes) + '</strong>' : '<span style="opacity: 0.5;">-</span>'
                    );
                    viewModal.show();
                } else {
                    showAlert(response.error || 'Error loading sale details', 'error');
                }
            },
            error: function(xhr) {
                let errorMsg = 'Error loading sale details.';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else if (xhr.status === 404) {
                    errorMsg = 'Sale record not found.';
                } else if (xhr.status === 500) {
                    errorMsg = 'Server error. Please try again.';
                }
                showAlert(errorMsg, 'error');
            }
        });
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
});
