from passlib.context import CryptContext

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create a hashed password
password = "admin123"
hashed_password = pwd_context.hash(password)

print(f"\nUse these credentials:")
print(f"Username: admin")
print(f"Password: {password}")
print(f"\nAdd this to auth.py demo_users_db:")
print(f"""
demo_users_db = {{
    "admin": {{
        "username": "admin",
        "full_name": "Administrator",
        "disabled": False,
        "hashed_password": "{hashed_password}"  # password is "admin123"
    }}
}}
""")