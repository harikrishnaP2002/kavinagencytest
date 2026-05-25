import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    app.config["SECRET_KEY"] = os.urandom(18)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(base_dir, 'database.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Optimized connection pools for SQLite
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 100,
        'max_overflow': 150,
        'pool_pre_ping': True,
        'pool_recycle': 1800,
        'pool_timeout': 90,
        'connect_args': {
            'timeout': 90,
            'check_same_thread': False,
            'isolation_level': None,
        }
    }
    
    app.config['SQLALCHEMY_RECORD_QUERIES'] = False
    app.config['SQLALCHEMY_COMMIT_ON_TEARDOWN'] = False
    
    # Register blueprints
    from .shop_master import shop_master_bp
    app.register_blueprint(shop_master_bp)
    
    from .product_master import product_master_bp
    app.register_blueprint(product_master_bp)
    
    from .shop_product_link import shop_product_link_bp
    app.register_blueprint(shop_product_link_bp)
    
    from .shop_product_price_link import shop_product_price_link_bp
    app.register_blueprint(shop_product_price_link_bp)
    
    from .dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp)
    
    from .calculators import calculators_bp
    app.register_blueprint(calculators_bp)
    
    db.init_app(app)
    migrate.init_app(app, db, render_as_batch=True, compare_type=True)
    
    # Configure SQLite for maximum performance
    with app.app_context():
        @db.event.listens_for(db.engine, 'connect')
        def configure_sqlite_connection(dbapi_connection, connection_record):
            """Configure each SQLite connection for optimal performance"""
            cursor = dbapi_connection.cursor()
            
            # WAL mode for concurrent reads
            cursor.execute("PRAGMA journal_mode=WAL;")
            
            # Performance optimizations
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA cache_size=20000;")
            cursor.execute("PRAGMA temp_store=MEMORY;")
            cursor.execute("PRAGMA mmap_size=268435456;")
            cursor.execute("PRAGMA busy_timeout=90000;")
            cursor.execute("PRAGMA wal_autocheckpoint=1000;")
            
            # Query optimizations
            cursor.execute("PRAGMA optimize;")
            
            cursor.close()
        
        db.create_all()
    
    return app
