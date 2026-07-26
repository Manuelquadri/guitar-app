from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


ALLOWED_HOSTS = {
    "cifraclub.com",
    "www.cifraclub.com",
    "cifraclub.com.br",
    "www.cifraclub.com.br",
}
MAX_REDIRECTS = 3


class ScraperError(Exception):
    """Error esperado y apto para mostrar al usuario."""


def _validate_url(url):
    if not isinstance(url, str) or not url.strip():
        raise ScraperError("Pega una URL válida de Cifra Club.")

    normalized_url = url.strip()
    if "://" not in normalized_url:
        normalized_url = f"https://{normalized_url}"

    parsed = urlparse(normalized_url)
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in ALLOWED_HOSTS:
        raise ScraperError(
            "Solo se pueden importar enlaces de cifraclub.com o cifraclub.com.br."
        )
    if parsed.username or parsed.password or parsed.port:
        raise ScraperError("La URL de Cifra Club no tiene un formato válido.")

    return normalized_url


def _build_session():
    retry_policy = Retry(
        total=2,
        connect=2,
        read=2,
        backoff_factor=0.4,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry_policy))
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9,pt-BR;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
        }
    )
    return session


def _download_page(url):
    session = _build_session()
    current_url = _validate_url(url)

    for _ in range(MAX_REDIRECTS + 1):
        response = session.get(current_url, timeout=(5, 20), allow_redirects=False)
        if response.is_redirect or response.is_permanent_redirect:
            destination = response.headers.get("Location")
            if not destination:
                raise ScraperError("Cifra Club devolvió una redirección incompleta.")
            current_url = _validate_url(urljoin(current_url, destination))
            continue

        if response.status_code in {401, 403}:
            raise ScraperError(
                "Cifra Club bloqueó temporalmente la importación. Inténtalo de nuevo en unos minutos."
            )
        if response.status_code == 404:
            raise ScraperError("No encontramos esa canción en Cifra Club.")
        response.raise_for_status()
        return response.content

    raise ScraperError("El enlace redirigió demasiadas veces.")


def _first_text(soup, selectors):
    for selector in selectors:
        element = soup.select_one(selector)
        if element:
            text = element.get_text(" ", strip=True)
            if text:
                return text
    return None


def _title_metadata_fallback(soup):
    page_title = soup.title.get_text(" ", strip=True) if soup.title else ""
    suffix = " - Cifra Club"
    if not page_title.endswith(suffix):
        return None, None

    title_and_artist = page_title[: -len(suffix)]
    parts = title_and_artist.rsplit(" - ", 1)
    return tuple(parts) if len(parts) == 2 else (None, None)


def _sanitize_content(content_tag):
    fragment = BeautifulSoup(content_tag.decode_contents(), "html.parser")
    for dangerous in fragment.select("script, style, iframe, object, embed"):
        dangerous.decompose()
    for tag in list(fragment.find_all(True)):
        if tag.name == "b":
            tag.attrs = {}
        else:
            tag.unwrap()
    return fragment.decode_contents(formatter="html").strip()


def parse_song_page(html):
    soup = BeautifulSoup(html, "html.parser")
    title = _first_text(soup, ("h1.t1", "[data-cy='song-title']", "main h1"))
    artist = _first_text(soup, ("h2.t3", "[data-cy='artist-name']", ".song-artist"))

    fallback_title, fallback_artist = _title_metadata_fallback(soup)
    title = title or fallback_title
    artist = artist or fallback_artist
    content_tag = soup.select_one(".cifra_cnt pre, main pre, pre")

    if not title:
        raise ScraperError(
            "No pudimos reconocer el título. Es posible que Cifra Club haya cambiado la página."
        )
    if not artist:
        raise ScraperError(
            "No pudimos reconocer el artista. Es posible que Cifra Club haya cambiado la página."
        )
    if not content_tag:
        raise ScraperError(
            "Ese enlace no contiene una cifra compatible o Cifra Club cambió su formato."
        )

    content = _sanitize_content(content_tag)
    if len(content) < 10:
        raise ScraperError("La cifra encontrada está vacía.")

    return {"title": title[:100], "artist": artist[:100], "content": content}


def scrape_and_save_song(url, db, Song):
    try:
        song_data = parse_song_page(_download_page(url))
        existing_song = Song.query.filter_by(
            artist=song_data["artist"], title=song_data["title"]
        ).first()
        if existing_song:
            return (
                False,
                f"“{song_data['title']}” de {song_data['artist']} ya está en el cancionero.",
            )

        new_song = Song(**song_data)
        db.session.add(new_song)
        db.session.commit()
        return True, new_song
    except ScraperError as error:
        return False, str(error)
    except requests.exceptions.Timeout:
        return False, "Cifra Club tardó demasiado en responder. Inténtalo nuevamente."
    except requests.exceptions.RequestException:
        return False, "No se pudo conectar con Cifra Club en este momento."
    except Exception:
        db.session.rollback()
        return False, "Ocurrió un error interno al importar la canción."
