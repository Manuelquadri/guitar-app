# models.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    artist = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False) # Aquí irá la letra con acordes

    def to_dict(self):
        return {
            "id": self.id,
            "artist": self.artist,
            "title": self.title,
            "content": self.content
        }