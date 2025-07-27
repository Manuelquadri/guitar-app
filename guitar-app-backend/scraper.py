# scraper.py
import requests
from bs4 import BeautifulSoup

# Ya no importamos app y db aquí, se los pasaremos como argumentos
# para evitar importaciones circulares y hacer la función más pura.

def scrape_and_save_song(url, db, Song):
    """
    Scrapea una URL de Cifra Club y la guarda en la base de datos.
    Devuelve el objeto de la canción si tiene éxito, o None si falla.
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        page = requests.get(url, headers=headers)
        page.raise_for_status()

        soup = BeautifulSoup(page.content, "html.parser")

        artist_tag = soup.find('h2', class_='t3')
        title_tag = soup.find('h1', class_='t1')
        content_tag = soup.find('pre')

        if not all([artist_tag, title_tag, content_tag]):
            print(f"No se pudo encontrar toda la información en {url}.")
            return None

        artist = artist_tag.get_text(strip=True)
        title = title_tag.get_text(strip=True)
        content = "".join(str(item) for item in content_tag.contents)

        # Verificar si ya existe
        existing_song = Song.query.filter_by(artist=artist, title=title).first()
        if existing_song:
            print(f"La canción '{title}' de {artist} ya existe.")
            return existing_song # Devolvemos la canción existente

        new_song = Song(artist=artist, title=title, content=content)
        db.session.add(new_song)
        db.session.commit()
        print(f"¡Éxito! Se ha guardado '{title}' de {artist}.")
        return new_song

    except Exception as e:
        print(f"Ocurrió un error inesperado al scrapear {url}: {e}")
        # Revertimos cualquier cambio en la sesión de la BD si algo falló
        db.session.rollback()
        return None