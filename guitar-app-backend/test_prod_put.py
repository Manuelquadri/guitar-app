import requests

BASE_URL = "https://guitar-app-backend.onrender.com/api"

# 1. Register
print("Registering...")
resp = requests.post(f"{BASE_URL}/register", json={"username": "test_debugger_user", "password": "password123"})
print(resp.status_code, resp.text)

# 2. Login
print("Logging in...")
resp = requests.post(f"{BASE_URL}/login", json={"username": "test_debugger_user", "password": "password123"})
print(resp.status_code, resp.text)

if resp.status_code == 200:
    token = resp.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. GET Song 1
    print("\nGET Song 1...")
    resp = requests.get(f"{BASE_URL}/songs/1", headers=headers)
    print(resp.status_code, resp.text)
    
    # 4. PUT Song 1 (change speed to 450)
    print("\nPUT Song 1 (speed 450)...")
    resp = requests.put(f"{BASE_URL}/songs/1", headers=headers, json={"speed": 450, "transposition": 0})
    print(resp.status_code, resp.text)
    
    # 5. GET Song 1 again to verify
    print("\nGET Song 1 (verify)...")
    resp = requests.get(f"{BASE_URL}/songs/1", headers=headers)
    print(resp.status_code, resp.text)
