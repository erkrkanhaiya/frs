import bcrypt

def hash_password(password):
    # Convert the password to bytes
    password = password.encode('utf-8')
    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    return hashed

password = "changeme123"
hashed = hash_password(password)
print(f"Password: {password}")
print(f"Hashed: {hashed}")

# Verify the password
test = bcrypt.checkpw(password.encode('utf-8'), hashed)
print(f"Verification test: {test}")