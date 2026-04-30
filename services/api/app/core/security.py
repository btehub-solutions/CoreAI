from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from app.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, business_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "business_id": str(business_id),
         "role": role, "exp": expire, "type": "access"},
        settings.secret_key, algorithm="HS256")

def create_refresh_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(
        days=settings.refresh_token_expire_days)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "type": "refresh"},
        settings.secret_key, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
