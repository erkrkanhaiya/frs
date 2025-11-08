from fastapi.testclient import TestClient
from alerts_server import app
import shutil
import os

client = TestClient(app)

# Get token
resp = client.post('/token', data={'username':'admin','password':'changeme123'}, headers={'Content-Type':'application/x-www-form-urlencoded'})
print('token_status', resp.status_code)
access = resp.json()['access_token']

# Create new person
print('\n--- Creating new person "demo_person" ---')
resp2 = client.post('/persons', json={'name': 'demo_person'}, headers={'Authorization': f'Bearer {access}'})
print('create_person_status', resp2.status_code)
print('create_person_body', resp2.json())

# Copy a sample image to upload
sample_img = 'faces_db/sample_person/20251108_013109_537875_1.jpg'
if os.path.exists(sample_img):
    # Upload image
    print('\n--- Uploading image for demo_person ---')
    with open(sample_img, 'rb') as f:
        resp3 = client.post(
            '/persons/demo_person/images',
            files={'file': ('demo.jpg', f, 'image/jpeg')},
            headers={'Authorization': f'Bearer {access}'}
        )
    print('upload_status', resp3.status_code)
    print('upload_body', resp3.json())

    # List images for demo_person
    print('\n--- Listing images for demo_person ---')
    resp4 = client.get('/persons/demo_person/images', headers={'Authorization': f'Bearer {access}'})
    print('list_images_status', resp4.status_code)
    print('list_images_body', resp4.json())
else:
    print(f'Sample image not found: {sample_img}')

# List all persons
print('\n--- Listing all persons ---')
resp5 = client.get('/persons', headers={'Authorization': f'Bearer {access}'})
print('list_persons_status', resp5.status_code)
print('list_persons_body', resp5.json())
