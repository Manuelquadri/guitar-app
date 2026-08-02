import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from models import db


load_dotenv()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    database_url = os.environ.get("DATABASE_URL", "sqlite:///database.db")
    jwt_secret = os.environ.get("JWT_SECRET_KEY")
    if not jwt_secret:
        raise RuntimeError("JWT_SECRET_KEY must be configured.")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    database_config = {
        "SQLALCHEMY_DATABASE_URI": database_url,
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "JWT_SECRET_KEY": jwt_secret,
        "JWT_ACCESS_TOKEN_EXPIRES": timedelta(days=30),
        "JWT_REFRESH_TOKEN_EXPIRES": timedelta(days=365),
    }
    if database_url.startswith("postgresql"):
        database_config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_pre_ping": True,
            "connect_args": {"options": "-csearch_path=public"},
        }
    app.config.from_mapping(database_config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    frontend_urls = os.environ.get("FRONTEND_URL", "*")
    allowed_origins = [
        origin.strip() for origin in frontend_urls.split(",") if origin.strip()
    ]
    CORS(
        app,
        resources={"/api/*": {"origins": allowed_origins or "*"}},
        supports_credentials=False,
    )

    from routes import api_bp

    app.register_blueprint(api_bp)
    return app
