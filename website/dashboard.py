from flask import Blueprint, render_template, jsonify
from . import db
from .models import ShopMaster, ProductMaster, ShopProductLink, ShopProductPriceLink
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/')

@dashboard_bp.route('/')
def index():
    return render_template('dashboard.html')

@dashboard_bp.route('/api/dashboard/stats')
def dashboard_stats():
    """Get dashboard statistics"""
    try:
        total_shops = ShopMaster.query.filter_by(is_active=True).count()
        total_products = ProductMaster.query.filter_by(is_active=True).count()
        total_links = ShopProductLink.query.filter_by(is_active=True).count()
        
        # Today's sales
        today = datetime.now().date()
        today_sales = ShopProductPriceLink.query.filter_by(sale_date=today).all()
        today_total = sum(float(sale.total_amount or 0) for sale in today_sales)
        today_quantity = sum(sale.quantity_sold or 0 for sale in today_sales)
        
        # This week's sales
        week_start = today - timedelta(days=today.weekday())
        week_sales = ShopProductPriceLink.query.filter(
            ShopProductPriceLink.sale_date >= week_start
        ).all()
        week_total = sum(float(sale.total_amount or 0) for sale in week_sales)
        
        # This month's sales
        month_start = today.replace(day=1)
        month_sales = ShopProductPriceLink.query.filter(
            ShopProductPriceLink.sale_date >= month_start
        ).all()
        month_total = sum(float(sale.total_amount or 0) for sale in month_sales)
        
        # Overall sales (all-time)
        all_sales = ShopProductPriceLink.query.all()
        overall_total = sum(float(sale.total_amount or 0) for sale in all_sales)
        overall_quantity = sum(sale.quantity_sold or 0 for sale in all_sales)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_shops': total_shops,
                'total_products': total_products,
                'total_links': total_links,
                'today_sales': {
                    'amount': round(today_total, 2),
                    'quantity': today_quantity
                },
                'week_sales': round(week_total, 2),
                'month_sales': round(month_total, 2),
                'overall_sales': {
                    'amount': round(overall_total, 2),
                    'quantity': overall_quantity
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
