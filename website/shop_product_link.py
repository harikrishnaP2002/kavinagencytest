from flask import Blueprint, render_template, request, jsonify
from . import db
from .models import ShopProductLink, ShopMaster, ProductMaster

shop_product_link_bp = Blueprint('shop_product_link', __name__, url_prefix='/shop-product-link')

@shop_product_link_bp.route('/')
def index():
    return render_template('shop_product_link.html')

@shop_product_link_bp.route('/api/list')
def list_links():
    """Get all shop-product links"""
    try:
        links = ShopProductLink.query.order_by(ShopProductLink.id.asc()).all()
        return jsonify({
            'success': True,
            'data': [link.to_dict() for link in links]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_link_bp.route('/api/create', methods=['POST'])
def create_link():
    """Create a new shop-product link"""
    try:
        data = request.get_json()
        shop_id = data.get('shop_id')
        product_id = data.get('product_id')
        
        if not shop_id or not product_id:
            return jsonify({'success': False, 'error': 'Shop ID and Product ID are required'}), 400
        
        # Check if link already exists
        existing = ShopProductLink.query.filter_by(
            shop_id=shop_id,
            product_id=product_id
        ).first()
        
        if existing:
            return jsonify({'success': False, 'error': 'This shop-product link already exists'}), 400
        
        amount = data.get('amount')
        if amount:
            try:
                amount = float(amount)
            except (ValueError, TypeError):
                amount = None
        
        link = ShopProductLink(
            shop_id=shop_id,
            product_id=product_id,
            amount=amount,
            is_active=data.get('is_active', True)
        )
        
        db.session.add(link)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Shop-Product link created successfully',
            'data': link.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_link_bp.route('/api/update/<int:link_id>', methods=['PUT'])
def update_link(link_id):
    """Update a shop-product link"""
    try:
        link = ShopProductLink.query.get_or_404(link_id)
        data = request.get_json()
        
        shop_id = data.get('shop_id', link.shop_id)
        product_id = data.get('product_id', link.product_id)
        
        # Check if new combination already exists
        if shop_id != link.shop_id or product_id != link.product_id:
            existing = ShopProductLink.query.filter_by(
                shop_id=shop_id,
                product_id=product_id
            ).first()
            
            if existing:
                return jsonify({'success': False, 'error': 'This shop-product link already exists'}), 400
        
        link.shop_id = shop_id
        link.product_id = product_id
        link.is_active = data.get('is_active', link.is_active)
        
        amount = data.get('amount')
        if amount is not None:
            try:
                link.amount = float(amount) if amount else None
            except (ValueError, TypeError):
                link.amount = None
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Shop-Product link updated successfully',
            'data': link.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_link_bp.route('/api/delete/<int:link_id>', methods=['DELETE'])
def delete_link(link_id):
    """Delete a shop-product link"""
    try:
        link = ShopProductLink.query.get_or_404(link_id)
        db.session.delete(link)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Shop-Product link deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_link_bp.route('/api/get/<int:link_id>')
def get_link(link_id):
    """Get a single shop-product link"""
    try:
        link = ShopProductLink.query.get_or_404(link_id)
        return jsonify({
            'success': True,
            'data': link.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_link_bp.route('/api/shops')
def get_shops():
    """Get all shops for dropdown"""
    try:
        shops = ShopMaster.query.filter_by(is_active=True).order_by(ShopMaster.shop_name).all()
        return jsonify({
            'success': True,
            'data': [{'id': s.id, 'name': s.shop_name} for s in shops]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_link_bp.route('/api/products')
def get_products():
    """Get all products for dropdown"""
    try:
        products = ProductMaster.query.filter_by(is_active=True).order_by(ProductMaster.product_name).all()
        return jsonify({
            'success': True,
            'data': [{'id': p.id, 'name': p.product_name} for p in products]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
