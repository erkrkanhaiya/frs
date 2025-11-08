from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "changeme123"
hashed = pwd_context.hash(password)
print(f"Hashed password for '{password}': {hashed}")
print("Test verify:", pwd_context.verify(password, hashed))