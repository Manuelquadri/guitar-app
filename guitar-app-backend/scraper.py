# guitar-app-backend/scraper.py
import requests
from bs4 import BeautifulSoup

def scrape_and_save_song(url, db, Song):
    """
    Scrapea una URL de Cifra Club de forma robusta.
    Devuelve una tupla: (éxito: bool, resultado: objeto Song o mensaje de error: str)
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        page = requests.get(url, headers=headers, timeout=10)
        page.raise_for_status() # Lanza un error si la URL devuelve 404, 500, etc.

        soup = BeautifulSoup(page.content, "html.parser")

        title_tag = soup.find('h1', class_='t1')
        artist_tag = soup.find('h2', class_='t3')
        content_tag = soup.find('pre')

        if not title_tag: return (False, "Scraper Error: No se encontró el título (selector 'h1.t1'). El HTML de Cifra Club puede haber cambiado.")
        if not artist_tag: return (False, "Scraper Error: No se encontró el artista (selector 'h2.t3'). El HTML de Cifra Club puede haber cambiado.")
        if not content_tag: return (False, "Scraper Error: No se encontró el contenido (selector 'pre'). El HTML de Cifra Club puede haber cambiado.")

        title = title_tag.get_text(strip=True)
        artist = artist_tag.get_text(strip=True)
        
        existing_song = Song.query.filter_by(artist=artist, title=title).first()
        if existing_song:
            return (False, f"La canción '{title}' de {artist} ya existe en la base de datos.")

        content = "".join(str(item) for item in content_tag.contents)
        
        new_song = Song(artist=artist, title=title, content=content)
        db.session.add(new_song)
        db.session.commit()
        
        return (True, new_song)

    except requests.exceptions.HTTPError as e:
        return (False, f"Error de red: La URL devolvió un código de estado {e.response.status_code}. ¿Es una URL válida?")
    except requests.exceptions.RequestException as e:
        return (False, f"Error de conexión: No se pudo acceder a Cifra Club. Causa: {e}")
    except Exception as e:
        db.session.rollback() # Previene errores en la sesión de la BD
        return (False, f"Ocurrió un error inesperado en el scraper: {str(e)}")