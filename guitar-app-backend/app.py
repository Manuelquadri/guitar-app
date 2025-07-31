# app.py
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from dotenv import load_dotenv
from models import db # Importa la instancia de db

# Cargar variables de entorno
load_dotenv()

# Instancias de extensiones
migrate = Migrate()
jwt = JWTManager()

def create_app():
    """
    Función factory para crear y configurar la aplicación Flask.
    """
    app = Flask(__name__)

    # --- Configuración Centralizada ---
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY')
    )

    # --- Inicialización de Extensiones ---
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # --- Configuración de CORS ---
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        CORS(app, origins=[frontend_url], methods=["GET", "POST", "PUT"], allow_headers=["Content-Type", "Authorization"], supports_credentials=True)

    # --- Importar y Registrar Rutas (Blueprints) ---
    from routes import api_bp
    app.register_blueprint(api_bp)

    return app