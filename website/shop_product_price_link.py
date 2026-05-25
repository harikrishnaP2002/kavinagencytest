from flask import Blueprint, render_template, request, jsonify
from . import db
from .models import ShopProductPriceLink, ShopMaster, ProductMaster, ShopProductLink
from datetime import datetime

shop_product_price_link_bp = Blueprint('shop_product_price_link', __name__, url_prefix='/shop-product-price-link')

@shop_product_price_link_bp.route('/')
def index():
    return render_template('shop_product_price_link.html')

@shop_product_price_link_bp.route('/api/list')
def list_price_links():
    """Get all shop-product-price links"""
    try:
        price_links = ShopProductPriceLink.query.order_by(ShopProductPriceLink.id.asc()).all()
        return jsonify({
            'success': True,
            'data': [link.to_dict() for link in price_links]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_price_link_bp.route('/api/create', methods=['POST'])
def create_price_link():
    """Create a new shop-product-price link (sale record)"""
    try:
        data = request.get_json()
        shop_id = data.get('shop_id')
        product_id = data.get('product_id')
        quantity_sold = data.get('quantity_sold')
        sale_date = data.get('sale_date')
        
        if not shop_id or not product_id:
            return jsonify({'success': False, 'error': 'Shop ID and Product ID are required'}), 400
        
        if not quantity_sold or quantity_sold <= 0:
            return jsonify({'success': False, 'error': 'Quantity is required and must be greater than 0'}), 400
        
        # Get amount from Shop-Product Link
        link = ShopProductLink.query.filter_by(
            shop_id=shop_id,
            product_id=product_id,
            is_active=True
        ).first()
        
        if not link or not link.amount:
            return jsonify({'success': False, 'error': 'No active link found for this shop-product combination. Please create a Shop-Product Link first.'}), 400
        
        price = float(link.amount)
        
        # Parse sale_date
        if sale_date:
            try:
                sale_date = datetime.strptime(sale_date, '%Y-%m-%d').date()
            except:
                sale_date = datetime.now().date()
        else:
            sale_date = datetime.now().date()
        
        # Calculate total amount
        total_amount = price * int(quantity_sold)
        
        price_link = ShopProductPriceLink(
            shop_id=shop_id,
            product_id=product_id,
            price=price,
            sale_date=sale_date,
            quantity_sold=quantity_sold,
            total_amount=total_amount,
            notes=data.get('notes', '')
        )
        
        db.session.add(price_link)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Sale record created successfully',
            'data': price_link.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_price_link_bp.route('/api/update/<int:link_id>', methods=['PUT'])
def update_price_link(link_id):
    """Update a shop-product-price link"""
    try:
        price_link = ShopProductPriceLink.query.get_or_404(link_id)
        data = request.get_json()
        
        shop_id = data.get('shop_id', price_link.shop_id)
        product_id = data.get('product_id', price_link.product_id)
        quantity_sold = data.get('quantity_sold', price_link.quantity_sold)
        
        if quantity_sold and quantity_sold <= 0:
            return jsonify({'success': False, 'error': 'Quantity must be greater than 0'}), 400
        
        # Get amount from Shop-Product Link if shop/product changed
        if shop_id != price_link.shop_id or product_id != price_link.product_id:
            link = ShopProductLink.query.filter_by(
                shop_id=shop_id,
                product_id=product_id,
                is_active=True
            ).first()
            
            if not link or not link.amount:
                return jsonify({'success': False, 'error': 'No active link found for this shop-product combination'}), 400
            
            price = float(link.amount)
        else:
            price = float(price_link.price)
        
        # Parse sale_date
        sale_date = price_link.sale_date
        if 'sale_date' in data and data['sale_date']:
            try:
                sale_date = datetime.strptime(data['sale_date'], '%Y-%m-%d').date()
            except:
                pass
        
        # Calculate total amount
        total_amount = price * int(quantity_sold)
        
        price_link.shop_id = shop_id
        price_link.product_id = product_id
        price_link.price = price
        price_link.sale_date = sale_date
        price_link.quantity_sold = quantity_sold
        price_link.total_amount = total_amount
        price_link.notes = data.get('notes', price_link.notes)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Sale record updated successfully',
            'data': price_link.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_price_link_bp.route('/api/delete/<int:link_id>', methods=['DELETE'])
def delete_price_link(link_id):
    """Delete a shop-product-price link"""
    try:
        price_link = ShopProductPriceLink.query.get_or_404(link_id)
        db.session.delete(price_link)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Sale record deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_price_link_bp.route('/api/get/<int:link_id>')
def get_price_link(link_id):
    """Get a single shop-product-price link"""
    try:
        price_link = ShopProductPriceLink.query.get_or_404(link_id)
        return jsonify({
            'success': True,
            'data': price_link.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@shop_product_price_link_bp.route('/api/shops')
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

@shop_product_price_link_bp.route('/api/products')
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

@shop_product_price_link_bp.route('/api/get-amount/<int:shop_id>/<int:product_id>')
def get_amount(shop_id, product_id):
    """Get amount from Shop-Product Link"""
    try:
        link = ShopProductLink.query.filter_by(
            shop_id=shop_id,
            product_id=product_id,
            is_active=True
        ).first()
        
        if link and link.amount:
            return jsonify({
                'success': True,
                'amount': float(link.amount)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No active link found for this shop-product combination'
            }), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@shop_product_price_link_bp.route('/api/linked-products/<int:shop_id>')
def get_linked_products(shop_id):
    """Products linked to a shop with a price (one request for batch entry)."""
    try:
        links = (
            ShopProductLink.query.filter_by(shop_id=shop_id, is_active=True)
            .join(ProductMaster, ShopProductLink.product_id == ProductMaster.id)
            .filter(ProductMaster.is_active == True)
            .order_by(ProductMaster.product_name)
            .all()
        )
        data = []
        for link in links:
            if link.amount:
                data.append({
                    'id': link.product_id,
                    'name': link.product.product_name,
                    'amount': float(link.amount),
                })
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@shop_product_price_link_bp.route('/api/create-batch', methods=['POST'])
def create_price_link_batch():
    """Create multiple sale rows for one shop in a single transaction."""
    try:
        data = request.get_json() or {}
        shop_id = data.get('shop_id')
        sale_date = data.get('sale_date')
        notes = (data.get('notes') or '').strip()
        lines = data.get('lines') or []

        if not shop_id:
            return jsonify({'success': False, 'error': 'Shop is required'}), 400

        parsed_lines = []
        for line in lines:
            pid = line.get('product_id')
            qty = line.get('quantity_sold')
            if pid is None or qty is None:
                continue
            try:
                q = int(qty)
            except (TypeError, ValueError):
                continue
            if q <= 0:
                continue
            parsed_lines.append((int(pid), q))

        if not parsed_lines:
            return jsonify({
                'success': False,
                'error': 'Add at least one product with quantity greater than 0',
            }), 400

        if sale_date:
            try:
                sale_date = datetime.strptime(sale_date, '%Y-%m-%d').date()
            except ValueError:
                sale_date = datetime.now().date()
        else:
            sale_date = datetime.now().date()

        created = []
        for product_id, quantity_sold in parsed_lines:
            link = ShopProductLink.query.filter_by(
                shop_id=shop_id,
                product_id=product_id,
                is_active=True,
            ).first()
            if not link or not link.amount:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'error': (
                        'No active shop–product price for one of the selected products. '
                        'Check Shop-Product Link for this shop.'
                    ),
                }), 400
            price = float(link.amount)
            total_amount = price * quantity_sold
            row = ShopProductPriceLink(
                shop_id=shop_id,
                product_id=product_id,
                price=price,
                sale_date=sale_date,
                quantity_sold=quantity_sold,
                total_amount=total_amount,
                notes=notes,
            )
            db.session.add(row)
            created.append(row)

        db.session.commit()
        grand_total = sum(float(r.total_amount or 0) for r in created)
        return jsonify({
            'success': True,
            'message': f'{len(created)} sale record(s) saved',
            'count': len(created),
            'grand_total': round(grand_total, 2),
            'data': [r.to_dict() for r in created],
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
