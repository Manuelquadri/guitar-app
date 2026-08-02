import unittest

from flask_jwt_extended import create_refresh_token

from app import create_app


class SessionRefreshTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_refresh_token_issues_a_new_access_token(self):
        with self.app.app_context():
            refresh_token = create_refresh_token(identity="42")

        response = self.client.post(
            "/api/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["access_token"])

    def test_access_token_is_rejected_by_refresh_endpoint(self):
        with self.app.app_context():
            from flask_jwt_extended import create_access_token

            access_token = create_access_token(identity="42")

        response = self.client.post(
            "/api/refresh",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
