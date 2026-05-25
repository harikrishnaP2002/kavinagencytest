from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from . import db
from .models import ShopMaster, LogMaster
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
import json
import logging

logger = logging.getLogger(__name__)

shop_master_bp = Blueprint('shop_master', __name__, url_prefix='/shop-master')

@shop_master_bp.route('/')
def index():
    return render_template('shop_master.html')

@shop_master_bp.route('/api/list')
def list_shops():
    """Get all shops"""
    try:
        shops = ShopMaster.query.order_by(ShopMaster.shop_name).all()
        return jsonify({
            'success': True,
            'data': [shop.to_dict() for shop in shops]
        })
    except OperationalError as e:
        logger.error(f"Database operational error in list_shops: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        logger.error(f"SQLAlchemy error in list_shops: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in list_shops: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@shop_master_bp.route('/api/create', methods=['POST'])
def create_shop():
    """Create a new shop"""
    try:
        # Validate request content type
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        
        # Validate data exists
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Validate mandatory fields
        shop_name = data.get('shop_name', '').strip()
        shop_place = data.get('shop_place', '').strip()
        
        if not shop_name:
            return jsonify({'success': False, 'error': 'Shop name is required and cannot be empty'}), 400
        if not shop_place:
            return jsonify({'success': False, 'error': 'Shop place is required and cannot be empty'}), 400
        
        # Validate field lengths
        if len(shop_name) > 200:
            return jsonify({'success': False, 'error': 'Shop name cannot exceed 200 characters'}), 400
        if len(shop_place) > 200:
            return jsonify({'success': False, 'error': 'Shop place cannot exceed 200 characters'}), 400
        
        owner_name = data.get('owner_name', '').strip() if data.get('owner_name') else ''
        phone_number = data.get('phone_number', '').strip() if data.get('phone_number') else ''
        
        if owner_name and len(owner_name) > 200:
            return jsonify({'success': False, 'error': 'Owner name cannot exceed 200 characters'}), 400
        if phone_number and len(phone_number) > 20:
            return jsonify({'success': False, 'error': 'Phone number cannot exceed 20 characters'}), 400
        
        # Validate is_active is boolean
        is_active = data.get('is_active', True)
        if not isinstance(is_active, bool):
            try:
                is_active = str(is_active).lower() in ('true', '1', 'yes', 'on')
            except:
                is_active = True
        
        shop = ShopMaster(
            shop_name=shop_name,
            shop_place=shop_place,
            owner_name=owner_name,
            phone_number=phone_number,
            is_active=is_active
        )
        
        db.session.add(shop)
        db.session.flush()  # Get the ID before commit
        
        # Log the ADD operation
        try:
            log_entry = LogMaster(
                table_name='shop_master',
                record_id=shop.id,
                action='ADD',
                new_data=json.dumps(shop.to_dict()),
                user=None
            )
            db.session.add(log_entry)
        except Exception as log_error:
            logger.warning(f"Failed to create log entry: {str(log_error)}")
            # Continue even if logging fails
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Shop created successfully',
            'data': shop.to_dict()
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error in create_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Duplicate entry or constraint violation. Please check your data.'}), 400
    except OperationalError as e:
        db.session.rollback()
        logger.error(f"Database operational error in create_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error in create_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except ValueError as e:
        db.session.rollback()
        logger.error(f"Value error in create_shop: {str(e)}")
        return jsonify({'success': False, 'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in create_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@shop_master_bp.route('/api/update/<int:shop_id>', methods=['PUT'])
def update_shop(shop_id):
    """Update a shop"""
    try:
        # Validate shop_id
        if not shop_id or shop_id <= 0:
            return jsonify({'success': False, 'error': 'Invalid shop ID'}), 400
        
        shop = ShopMaster.query.get(shop_id)
        if not shop:
            return jsonify({'success': False, 'error': 'Shop not found'}), 404
        
        # Validate request content type
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Store old data for logging
        old_data = shop.to_dict()
        
        # Validate and update shop_name
        if 'shop_name' in data:
            shop_name = str(data['shop_name']).strip()
            if not shop_name:
                return jsonify({'success': False, 'error': 'Shop name is required and cannot be empty'}), 400
            if len(shop_name) > 200:
                return jsonify({'success': False, 'error': 'Shop name cannot exceed 200 characters'}), 400
            shop.shop_name = shop_name
        
        # Validate and update shop_place
        if 'shop_place' in data:
            shop_place = str(data['shop_place']).strip()
            if not shop_place:
                return jsonify({'success': False, 'error': 'Shop place is required and cannot be empty'}), 400
            if len(shop_place) > 200:
                return jsonify({'success': False, 'error': 'Shop place cannot exceed 200 characters'}), 400
            shop.shop_place = shop_place
        
        # Update optional fields
        if 'owner_name' in data:
            owner_name = str(data['owner_name']).strip() if data['owner_name'] else ''
            if len(owner_name) > 200:
                return jsonify({'success': False, 'error': 'Owner name cannot exceed 200 characters'}), 400
            shop.owner_name = owner_name
        
        if 'phone_number' in data:
            phone_number = str(data['phone_number']).strip() if data['phone_number'] else ''
            if len(phone_number) > 20:
                return jsonify({'success': False, 'error': 'Phone number cannot exceed 20 characters'}), 400
            shop.phone_number = phone_number
        
        # Validate and update is_active
        if 'is_active' in data:
            is_active = data['is_active']
            if not isinstance(is_active, bool):
                try:
                    is_active = str(is_active).lower() in ('true', '1', 'yes', 'on')
                except:
                    is_active = shop.is_active
            shop.is_active = is_active
        
        db.session.flush()  # Get updated data before commit
        
        # Log the EDIT operation
        try:
            log_entry = LogMaster(
                table_name='shop_master',
                record_id=shop.id,
                action='EDIT',
                old_data=json.dumps(old_data),
                new_data=json.dumps(shop.to_dict()),
                user=None
            )
            db.session.add(log_entry)
        except Exception as log_error:
            logger.warning(f"Failed to create log entry: {str(log_error)}")
            # Continue even if logging fails
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Shop updated successfully',
            'data': shop.to_dict()
        })
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error in update_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Duplicate entry or constraint violation. Please check your data.'}), 400
    except OperationalError as e:
        db.session.rollback()
        logger.error(f"Database operational error in update_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error in update_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except ValueError as e:
        db.session.rollback()
        logger.error(f"Value error in update_shop: {str(e)}")
        return jsonify({'success': False, 'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in update_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@shop_master_bp.route('/api/delete/<int:shop_id>', methods=['DELETE'])
def delete_shop(shop_id):
    """Delete a shop"""
    try:
        # Validate shop_id
        if not shop_id or shop_id <= 0:
            return jsonify({'success': False, 'error': 'Invalid shop ID'}), 400
        
        shop = ShopMaster.query.get(shop_id)
        if not shop:
            return jsonify({'success': False, 'error': 'Shop not found'}), 404
        
        # Store old data for logging before deletion
        old_data = shop.to_dict()
        
        db.session.delete(shop)
        
        # Log the DELETE operation
        try:
            log_entry = LogMaster(
                table_name='shop_master',
                record_id=shop_id,
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
            'message': 'Shop deleted successfully'
        })
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error in delete_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Cannot delete shop due to existing references. Please remove related records first.'}), 400
    except OperationalError as e:
        db.session.rollback()
        logger.error(f"Database operational error in delete_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error in delete_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in delete_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@shop_master_bp.route('/api/get/<int:shop_id>')
def get_shop(shop_id):
    """Get a single shop"""
    try:
        # Validate shop_id
        if not shop_id or shop_id <= 0:
            return jsonify({'success': False, 'error': 'Invalid shop ID'}), 400
        
        shop = ShopMaster.query.get(shop_id)
        if not shop:
            return jsonify({'success': False, 'error': 'Shop not found'}), 404
        
        return jsonify({
            'success': True,
            'data': shop.to_dict()
        })
    except OperationalError as e:
        logger.error(f"Database operational error in get_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database connection error. Please try again.'}), 500
    except SQLAlchemyError as e:
        logger.error(f"SQLAlchemy error in get_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error occurred. Please contact administrator.'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in get_shop: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500

@shop_master_bp.route('/api/test-connection', methods=['GET'])
def test_connection():
    """Test database connectivity"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        db.session.commit()
        
        # Test query
        shop_count = ShopMaster.query.count()
        
        return jsonify({
            'success': True,
            'message': 'Database connection successful',
            'data': {
                'connected': True,
                'shop_count': shop_count,
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
    except SQLAlchemyError as e:
        logger.error(f"SQLAlchemy error in test_connection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Database error occurred',
            'data': {
                'connected': False,
                'status': 'ERROR',
                'details': str(e)
            }
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error in test_connection: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Connection test failed',
            'data': {
                'connected': False,
                'status': 'ERROR',
                'details': str(e)
            }
        }), 500

@shop_master_bp.route('/api/reset-database', methods=['POST'])
def reset_database():
    """Reset/clear all data from shop_master and log_master tables"""
    try:
        # Security check - in production, add authentication/authorization
        confirm = request.get_json().get('confirm', False)
        if not confirm:
            return jsonify({'success': False, 'error': 'Confirmation required. Set confirm: true in request body.'}), 400
        
        # Delete all shops
        deleted_shops_count = ShopMaster.query.delete()
        
        # Delete all logs
        deleted_logs_count = LogMaster.query.delete()
        
        db.session.commit()
        
        logger.info(f"Database reset: {deleted_shops_count} shops and {deleted_logs_count} logs deleted")
        
        return jsonify({
            'success': True,
            'message': f'Database reset successfully. Deleted {deleted_shops_count} shops and {deleted_logs_count} log entries.'
        })
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Integrity error in reset_database: {str(e)}")
        return jsonify({'success': False, 'error': 'Cannot reset database due to foreign key constraints. Please remove related records first.'}), 400
    except OperationalError as e:
        db.session.rollback()
        logger.error(f"Database operational error in reset_database: {str(e)}")
        return jsonify({'success': False, 'error': 'Unable to process request. Please try again.'}), 500
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"SQLAlchemy error in reset_database: {str(e)}")
        return jsonify({'success': False, 'error': 'Unable to save shop. Please try again.'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error in reset_database: {str(e)}")
        return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500
