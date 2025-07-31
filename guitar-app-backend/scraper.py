# scraper.py
import requests
from bs4 import BeautifulSoup

def scrape_and_save_song(url, db, Song):
    """
    Scrapea una URL de Cifra Club.
    Devuelve una tupla: (éxito: bool, resultado: objeto Song o mensaje de error: str)
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        page = requests.get(url, headers=headers)
        page.raise_for_status()

        soup = BeautifulSoup(page.content, "html.parser")

        # Selectores ACTUALIZADOS (a fecha de hoy, pueden cambiar)
        title_tag = soup.find('h1', class_='t1')
        artist_tag = soup.find('h2', class_='t3')
        content_tag = soup.find('pre')

        # Verificación individual para dar un error claro
        if not title_tag:
            return (False, "No se pudo encontrar el título (selector 'h1.t1'). El HTML de la página puede haber cambiado.")
        if not artist_tag:
            return (False, "No se pudo encontrar el artista (selector 'h2.t3'). El HTML de la página puede haber cambiado.")
        if not content_tag:
            return (False, "No se pudo encontrar el contenido de la canción (selector 'pre'). El HTML de la página puede haber cambiado.")

        title = title_tag.get_text(strip=True)
        artist = artist_tag.get_text(strip=True)
        
        # Evitar duplicados ANTES de hacer el trabajo
        existing_song = Song.query.filter_by(artist=artist, title=title).first()
        if existing_song:
            return (False, f"La canción '{title}' de {artist} ya existe en la base de datos.")

        content = "".join(str(item) for item in content_tag.contents)
        
        new_song = Song(artist=artist, title=title, content=content, transposition=0)
        db.session.add(new_song)
        db.session.commit()
        
        return (True, new_song)

    except requests.exceptions.HTTPError as http_err:
        return (False, f"Error al acceder a la URL: {http_err}")
    except Exception as e:
        db.session.rollback()
        return (False, f"Ocurrió un error inesperado durante el scraping: {e}")