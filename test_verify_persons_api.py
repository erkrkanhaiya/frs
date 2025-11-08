from fastapi.testclient import TestClient
from alerts_server import app

client = TestClient(app)

# Get token
resp = client.post('/token', data={'username':'admin','password':'changeme123'}, headers={'Content-Type':'application/x-www-form-urlencoded'})
print('token_status', resp.status_code)
if resp.status_code != 200:
    print('token_body', resp.text)
    raise SystemExit(1)
access = resp.json()['access_token']

# GET persons
resp2 = client.get('/persons', headers={'Authorization': f'Bearer {access}'})
print('persons_status', resp2.status_code)
print('persons_body', resp2.json())
