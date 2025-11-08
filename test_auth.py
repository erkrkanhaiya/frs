import bcrypt
from passlib.context import CryptContext

# Test both passlib and bcrypt directly
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "changeme123"
stored_hash = "$2b$12$YHzpKTygDkfMh5VgpU6FB.QWdA8/awxqxzsyJFoKHaSbstbMbeh96"

# Test with passlib
print("Testing with passlib:")
try:
    result = pwd_context.verify(password, stored_hash)
    print(f"Password verification result: {result}")
except Exception as e:
    print(f"Passlib error: {e}")

# Test with bcrypt directly
print("\nTesting with bcrypt directly:")
try:
    result = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f"Password verification result: {result}")
except Exception as e:
    print(f"Bcrypt error: {e}")

# Generate new hash for comparison
print("\nGenerating new hash:")
try:
    new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    print(f"New hash: {new_hash}")
    verify_result = bcrypt.checkpw(password.encode('utf-8'), new_hash)
    print(f"Verification with new hash: {verify_result}")
except Exception as e:
    print(f"Hash generation error: {e}")