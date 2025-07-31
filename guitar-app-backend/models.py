# models.py
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# Tabla de Usuarios
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Relación: un usuario puede tener muchas "versiones de canción"
    user_songs = db.relationship('UserSong', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "username": self.username}

# Tabla de Canciones Maestras (casi sin cambios)
class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    artist = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    
    # Relación: una canción puede ser personalizada por muchos usuarios
    user_versions = db.relationship('UserSong', backref='song', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "artist": self.artist,
            "title": self.title,
            "content": self.content,
        }

# ¡NUEVA TABLA PUENTE!
class UserSong(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('song.id'), nullable=False)
    
    # El contenido y la afinación personalizados son opcionales (pueden ser NULL)
    content = db.Column(db.Text, nullable=True)
    transposition = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "song_id": self.song_id,
            "content": self.content,
            "transposition": self.transposition,
        }