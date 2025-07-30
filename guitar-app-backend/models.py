# models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    artist = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False) # Aquí irá la letra con acordes
    # default=0 asegura que las canciones existentes no den error.
    transposition = db.Column(db.Integer, nullable=False, default=0)
    def to_dict(self):
        return {
            "id": self.id,
            "artist": self.artist,
            "title": self.title,
            "content": self.content,
             "transposition": self.transposition
        }