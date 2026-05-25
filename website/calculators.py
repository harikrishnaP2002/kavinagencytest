from flask import Blueprint, render_template

calculators_bp = Blueprint('calculators', __name__, url_prefix='/calculators')

@calculators_bp.route('/denomination')
def denomination_calculator():
    return render_template('denomination_calculator.html')

@calculators_bp.route('/product')
def product_calculator():
    return render_template('product_calculator.html')
