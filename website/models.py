from . import db
from datetime import datetime

class ShopMaster(db.Model):
    __tablename__ = 'shop_master'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    shop_name = db.Column(db.String(200), nullable=False)
    shop_place = db.Column(db.String(200), nullable=False)
    owner_name = db.Column(db.String(200))
    phone_number = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shop_product_links = db.relationship('ShopProductLink', back_populates='shop', cascade='all, delete-orphan')
    shop_product_price_links = db.relationship('ShopProductPriceLink', back_populates='shop', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'keyno': self.id,  # Keyno is same as id (auto-increment)
            'shop_name': self.shop_name,
            'shop_place': self.shop_place,
            'owner_name': self.owner_name,
            'phone_number': self.phone_number,
            'is_active': self.is_active,
            'status': 'Active' if self.is_active else 'Inactive',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

class ProductMaster(db.Model):
    __tablename__ = 'product_master'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_name = db.Column(db.String(200), nullable=False, unique=True)
    product_code = db.Column(db.String(50), unique=True)
    product_description = db.Column(db.Text)
    product_category = db.Column(db.String(100))
    unit_of_measure = db.Column(db.String(20), default='PCS')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shop_product_links = db.relationship('ShopProductLink', back_populates='product', cascade='all, delete-orphan')
    shop_product_price_links = db.relationship('ShopProductPriceLink', back_populates='product', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_name': self.product_name,
            'product_code': self.product_code,
            'product_description': self.product_description,
            'product_category': self.product_category,
            'unit_of_measure': self.unit_of_measure,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

class ShopProductLink(db.Model):
    __tablename__ = 'shop_product_link'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop_master.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product_master.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shop = db.relationship('ShopMaster', back_populates='shop_product_links')
    product = db.relationship('ProductMaster', back_populates='shop_product_links')
    
    # Unique constraint on shop_id and product_id combination
    __table_args__ = (db.UniqueConstraint('shop_id', 'product_id', name='unique_shop_product'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'shop_id': self.shop_id,
            'product_id': self.product_id,
            'shop_name': self.shop.shop_name if self.shop else None,
            'product_name': self.product.product_name if self.product else None,
            'amount': float(self.amount) if self.amount else 0.0,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

class ShopProductPriceLink(db.Model):
    __tablename__ = 'shop_product_price_link'
    
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop_master.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product_master.id'), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    sale_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    quantity_sold = db.Column(db.Integer, default=0)
    total_amount = db.Column(db.Numeric(10, 2))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shop = db.relationship('ShopMaster', back_populates='shop_product_price_links')
    product = db.relationship('ProductMaster', back_populates='shop_product_price_links')
    
    def to_dict(self):
        return {
            'id': self.id,
            'shop_id': self.shop_id,
            'product_id': self.product_id,
            'shop_name': self.shop.shop_name if self.shop else None,
            'product_name': self.product.product_name if self.product else None,
            'price': float(self.price) if self.price else 0.0,
            'sale_date': self.sale_date.strftime('%Y-%m-%d') if self.sale_date else None,
            'quantity_sold': self.quantity_sold,
            'total_amount': float(self.total_amount) if self.total_amount else 0.0,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

class LogMaster(db.Model):
    __tablename__ = 'log_master'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    table_name = db.Column(db.String(100), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(20), nullable=False)  # ADD, EDIT, DELETE
    old_data = db.Column(db.Text)  # JSON string of old data (for EDIT/DELETE)
    new_data = db.Column(db.Text)  # JSON string of new data (for ADD/EDIT)
    user = db.Column(db.String(100))  # Can be extended for user tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'table_name': self.table_name,
            'record_id': self.record_id,
            'action': self.action,
            'old_data': self.old_data,
            'new_data': self.new_data,
            'user': self.user,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
