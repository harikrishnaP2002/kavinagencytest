from flask import Blueprint, render_template, request, jsonify
from . import db
from .models import ProductMaster, LogMaster
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
import json
import logging

logger = logging.getLogger(__name__)

product_master_bp = Blueprint('product_master', __name__, url_prefix='/product-master')

@product_master_bp.route('/')
def index():
    return render_template('product_master.html')

@product_master_bp.route('/api/list')
def list_products():
    """Get all products"""
    try:
        products = ProductMaster.query.order_by(ProductMaster.id.asc()).all()
        return jsonify({
            'success': True,
            'data': [product.to_dict() for product in products]
        })
    except OperationalError as e:
        logger.error(f"Database operational error in list_products: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        logger.error(f"SQLAlchemy error in list_products: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in list_products: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@product_master_bp.route('/api/create', methods=['POST'])
def create_product():
    """Create a new product"""
    try:
        # Validate request content type
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        
        # Validate data exists
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate mandatory fields
        product_name = data.get('product_name', '').strip()
        if not product_name:
            return jsonify({'success': False, 'error': 'Product name is required and cannot be empty'}), 400
        
        # Validate field lengths
        if len(product_name) > 200:
            return jsonify({'success': False, 'error': 'Product name cannot exceed 200 characters'}), 400
        
        product_code = data.get('product_code', '').strip() if data.get('product_code') else ''
        product_description = data.get('product_description', '').strip() if data.get('product_description') else ''
        product_category = data.get('product_category', '').strip() if data.get('product_category') else ''
        unit_of_measure = data.get('unit_of_measure', 'PCS').strip()
        
        if product_code and len(product_code) > 50:
            return jsonify({'success': False, 'error': 'Product code cannot exceed 50 characters'}), 400
        if product_category and len(product_category) > 100:
            return jsonify({'success': False, 'error': 'Product category cannot exceed 100 characters'}), 400
        
        # Check if product name already exists
        existing = ProductMaster.query.filter_by(product_name=product_name).first()
        if existing:
            return jsonify({'success': False, 'error': 'Product name already exists'}), 400
        
        # Check if product code already exists (if provided)
        if product_code:
            existing_code = ProductMaster.query.filter_by(product_code=product_code).first()
            if existing_code:
                return jsonify({'success': False, 'error': 'Product code already exists'}), 400
        
        # Validate is_active is boolean
        is_active = data.get('is_active', True)
        if not isinstance(is_active, bool):
            try:
                is_active = str(is_active).lower() in ('true', '1', 'yes', 'on')
            except:
                is_active = True
        
        product = ProductMaster(
            product_name=product_name,
            product_code=product_code,
            product_description=product_description,
            product_category=product_category,
            unit_of_measure=unit_of_measure,
            is_active=is_active
        )
        
        db.session.add(product)
        db.session.flush()  # Get the ID before commit
        
        # Log the ADD operation
        try:
            log_entry = LogMaster(
                table_name='product_master',
                record_id=product.id,
                action='ADD',
                new_data=json.dumps(product.to_dict()),
                user=None
            )
            db.session.add(log_entry)
        except Exception as log_error:
            logger.warning(f"Failed to create log entry: {str(log_error)}")
            # Continue even if logging fails
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product created successfully',
            'data': product.to_dict()
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error in create_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Duplicate entry or constraint violation. Please check your data.'}), 400
    except OperationalError as e:
        db.session.rollback()
        logger.error(f"Database operational error in create_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error in create_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except ValueError as e:
        db.session.rollback()
        logger.error(f"Value error in create_product: {str(e)}")
        return jsonify({'success': False, 'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in create_product: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@product_master_bp.route('/api/update/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Update a product"""
    try:
        # Validate product_id
        if not product_id or product_id <= 0:
            return jsonify({'success': False, 'error': 'Invalid product ID'}), 400
        
        product = ProductMaster.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404
        
        # Validate request content type
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Store old data for logging
        old_data = product.to_dict()
        
        # Validate and update product_name
        if 'product_name' in data:
            product_name = str(data['product_name']).strip()
            if not product_name:
                return jsonify({'success': False, 'error': 'Product name is required and cannot be empty'}), 400
            if len(product_name) > 200:
                return jsonify({'success': False, 'error': 'Product name cannot exceed 200 characters'}), 400
            if product_name != product.product_name:
                existing = ProductMaster.query.filter_by(product_name=product_name).first()
                if existing:
                    return jsonify({'success': False, 'error': 'Product name already exists'}), 400
            product.product_name = product_name
        
        # Update optional fields
        if 'product_code' in data:
            product_code = str(data['product_code']).strip() if data['product_code'] else ''
            if product_code and len(product_code) > 50:
                return jsonify({'success': False, 'error': 'Product code cannot exceed 50 characters'}), 400
            if product_code != product.product_code:
                if product_code:
                    existing_code = ProductMaster.query.filter_by(product_code=product_code).first()
                    if existing_code:
                        return jsonify({'success': False, 'error': 'Product code already exists'}), 400
            product.product_code = product_code
        
        if 'product_description' in data:
            product.product_description = str(data['product_description']).strip() if data['product_description'] else ''
        
        if 'product_category' in data:
            product_category = str(data['product_category']).strip() if data['product_category'] else ''
            if product_category and len(product_category) > 100:
                return jsonify({'success': False, 'error': 'Product category cannot exceed 100 characters'}), 400
            product.product_category = product_category
        
        if 'unit_of_measure' in data:
            product.unit_of_measure = str(data['unit_of_measure']).strip() if data['unit_of_measure'] else 'PCS'
        
        # Validate and update is_active
        if 'is_active' in data:
            is_active = data['is_active']
            if not isinstance(is_active, bool):
                try:
                    is_active = str(is_active).lower() in ('true', '1', 'yes', 'on')
                except:
                    is_active = product.is_active
            product.is_active = is_active
        
        db.session.flush()  # Get updated data before commit
        
        # Log the EDIT operation
        try:
            log_entry = LogMaster(
                table_name='product_master',
                record_id=product.id,
                action='EDIT',
                old_data=json.dumps(old_data),
                new_data=json.dumps(product.to_dict()),
                user=None
            )
            db.session.add(log_entry)
        except Exception as log_error:
            logger.warning(f"Failed to create log entry: {str(log_error)}")
            # Continue even if logging fails
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product updated successfully',
            'data': product.to_dict()
        })
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error in update_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Duplicate entry or constraint violation. Please check your data.'}), 400
    except OperationalError as e:
        db.session.rollback()
        logger.error(f"Database operational error in update_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error in update_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except ValueError as e:
        db.session.rollback()
        logger.error(f"Value error in update_product: {str(e)}")
        return jsonify({'success': False, 'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in update_product: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@product_master_bp.route('/api/delete/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Delete a product"""
    try:
        # Validate product_id
        if not product_id or product_id <= 0:
            return jsonify({'success': False, 'error': 'Invalid product ID'}), 400
        
        product = ProductMaster.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404
        
        # Store old data for logging before deletion
        old_data = product.to_dict()
        
        db.session.delete(product)
        
        # Log the DELETE operation
        try:
            log_entry = LogMaster(
                table_name='product_master',
                record_id=product_id,
                action='DELETE',
                old_data=json.dumps(old_data),
                user=None
            )
            db.session.add(log_entry)
        except Exception as log_error:
            logger.warning(f"Failed to create log entry: {str(log_error)}")
            # Continue even if logging fails
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product deleted successfully'
        })
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error in delete_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Cannot delete product due to existing references. Please remove related records first.'}), 400
    except OperationalError as e:
        db.session.rollback()
        logger.error(f"Database operational error in delete_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error in delete_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in delete_product: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@product_master_bp.route('/api/get/<int:product_id>')
def get_product(product_id):
    """Get a single product"""
    try:
        # Validate product_id
        if not product_id or product_id <= 0:
            return jsonify({'success': False, 'error': 'Invalid product ID'}), 400
        
        product = ProductMaster.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'error': 'Product not found'}), 404
        
        return jsonify({
            'success': True,
            'data': product.to_dict()
        })
    except OperationalError as e:
        logger.error(f"Database operational error in get_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        logger.error(f"SQLAlchemy error in get_product: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in get_product: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@product_master_bp.route('/api/test-connection', methods=['GET'])
def test_connection():
    """Test database connectivity"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        db.session.commit()
        
        # Check if table exists before querying
        try:
            # Test query - if table doesn't exist, this will raise an error
            product_count = ProductMaster.query.count()
        except Exception as table_error:
            # Table might not exist - create it
            logger.warning(f"Table may not exist: {str(table_error)}")
            try:
                from . import db
                db.create_all()
                product_count = ProductMaster.query.count()
            except Exception as create_error:
                logger.error(f"Failed to create tables: {str(create_error)}")
                return jsonify({
                    'success': False,
                    'error': 'Database tables not initialized. Please run migrations.',
                    'data': {
                        'connected': False,
                        'status': 'ERROR',
                        'details': 'Tables need to be created'
                    }
                }), 500
        
        return jsonify({
            'success': True,
            'message': 'Database connection successful',
            'data': {
                'connected': True,
                'product_count': product_count,
                'status': 'OK'
            }
        })
    except OperationalError as e:
        logger.error(f"Database operational error in test_connection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Database connection failed',
            'data': {
                'connected': False,
                'status': 'ERROR',
                'details': str(e)
            }
        }), 500

