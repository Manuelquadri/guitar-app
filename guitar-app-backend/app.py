import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from dotenv import load_dotenv
from models import db

load_dotenv()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY')
    )
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        CORS(app, origins=[frontend_url], methods=["GET", "POST", "PUT"], allow_headers=["Content-Type", "Authorization"], supports_credentials=True)

    from routes import api_bp
    app.register_blueprint(api_bp)

    return app