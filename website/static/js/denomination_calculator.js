$(document).ready(function() {
    const denominations = [500, 200, 100, 50, 20, 10, 5];
    
    // Calculate on input change - real-time calculation
    $('.note-input').on('input', function() {
        calculateRow($(this));
        calculateTotal();
    });
    
    // Reset button
    $('#resetBtn').click(function() {
        $('.note-input').val(0);
        denominations.forEach(denom => {
            $(`#value${denom}`).text('0');
        });
        calculateTotal();
    });
    
    // Calculate individual row value
    function calculateRow(input) {
        const inputId = input.attr('id');
        const denom = parseInt(inputId.replace('note', ''));
        const count = parseInt(input.val()) || 0;
        const rowTotal = denom * count;
        
        $(`#value${denom}`).text(rowTotal.toLocaleString('en-IN'));
    }
    
    // Calculate total
    function calculateTotal() {
        let totalAmount = 0;
        
        denominations.forEach(denom => {
            const count = parseInt($(`#note${denom}`).val()) || 0;
            const rowTotal = denom * count;
            totalAmount += rowTotal;
        });
        
        $('#totalAmount').text(totalAmount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }));
    }
    
    // Initial calculation
    calculateTotal();
});
