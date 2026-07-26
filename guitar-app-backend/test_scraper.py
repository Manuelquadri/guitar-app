import unittest

from scraper import ScraperError, _validate_url, parse_song_page


class ScraperParserTests(unittest.TestCase):
    def test_parses_current_cifra_club_structure(self):
        html = """
        <html>
          <head><title>De música ligera - Soda Stereo - Cifra Club</title></head>
          <body>
            <main>
              <h1 class="t1">De música ligera</h1>
              <h2 class="t3">Soda Stereo</h2>
              <div class="cifra_cnt">
                <pre><b>Bm</b> Ella durmió <span class="cnt">al calor</span></pre>
              </div>
            </main>
          </body>
        </html>
        """

        song = parse_song_page(html)

        self.assertEqual(song["title"], "De música ligera")
        self.assertEqual(song["artist"], "Soda Stereo")
        self.assertIn("<b>Bm</b>", song["content"])
        self.assertNotIn("<span", song["content"])

    def test_uses_document_title_as_metadata_fallback(self):
        html = """
        <html>
          <head><title>Ji ji ji - Patricio Rey - Cifra Club</title></head>
          <body><main><pre><b>Am</b> contenido suficiente</pre></main></body>
        </html>
        """

        song = parse_song_page(html)

        self.assertEqual(song["title"], "Ji ji ji")
        self.assertEqual(song["artist"], "Patricio Rey")

    def test_removes_unsafe_markup(self):
        html = """
        <html>
          <head><title>Una canción - Un artista - Cifra Club</title></head>
          <body>
            <pre><b onclick="bad()">C</b> letra segura
            <script>alert('bad')</script></pre>
          </body>
        </html>
        """

        song = parse_song_page(html)

        self.assertNotIn("onclick", song["content"])
        self.assertNotIn("script", song["content"])
        self.assertNotIn("alert", song["content"])

    def test_rejects_non_cifra_club_urls(self):
        with self.assertRaises(ScraperError):
            _validate_url("https://example.com/song")

    def test_accepts_both_supported_domains(self):
        self.assertEqual(
            _validate_url("www.cifraclub.com/artist/song"),
            "https://www.cifraclub.com/artist/song",
        )
        self.assertEqual(
            _validate_url("https://www.cifraclub.com.br/artist/song"),
            "https://www.cifraclub.com.br/artist/song",
        )


if __name__ == "__main__":
    unittest.main()
