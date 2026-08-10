"""Private Journal Book encryption — password + one-time recovery key (local only)."""

from __future__ import annotations

import base64
import hashlib
import os
import secrets
from typing import Any, Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Human-readable recovery word list (subset; enough entropy when sampling 8).
_WORDS = (
    "able alpine amber anchor apple arbor atlas aurora badge basil birch blaze "
    "bloom breeze cedar chord cipher citron clover comet coral cove craft crest "
    "dawn delta ember fable fern flint flora frost glacier harbor haven indigo "
    "iris ivory jade jasper kiln lantern lotus maple meadow mercury mist nebula "
    "north oak opal orbit orchard pearl pine prism quartz raven river sable sage "
    "silver spruce stone storm tide timber topaz vale violet willow zenith"
).split()


def generate_recovery_key() -> str:
    picks = [secrets.choice(_WORDS) for _ in range(8)]
    return "-".join(picks)


def _kdf(secret: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=200_000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret.encode("utf-8")))


def new_private_book_secrets(password: str) -> dict[str, str]:
    """Create salt, wrap DEK with password and with recovery key."""
    if len(password) < 4:
        raise ValueError("password too short")
    salt = os.urandom(16)
    dek = Fernet.generate_key()
    recovery = generate_recovery_key()
    pw_key = _kdf(password, salt)
    rk_key = _kdf(recovery, salt)
    wrapped_pw = Fernet(pw_key).encrypt(dek).decode("ascii")
    wrapped_rk = Fernet(rk_key).encrypt(dek).decode("ascii")
    return {
        "salt": base64.urlsafe_b64encode(salt).decode("ascii"),
        "wrapped_dek_password": wrapped_pw,
        "wrapped_dek_recovery": wrapped_rk,
        "recovery_key": recovery,  # show once; caller must not re-persist into vault
        "verifier": hashlib.sha256(dek).hexdigest()[:16],
    }


def unlock_dek(*, password: Optional[str] = None, recovery_key: Optional[str] = None, salt_b64: str, wrapped_pw: str, wrapped_rk: str) -> bytes:
    salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
    if password:
        key = _kdf(password, salt)
        try:
            return Fernet(key).decrypt(wrapped_pw.encode("ascii"))
        except InvalidToken as exc:
            raise PermissionError("password does not unlock this book") from exc
    if recovery_key:
        key = _kdf(recovery_key.strip(), salt)
        try:
            return Fernet(key).decrypt(wrapped_rk.encode("ascii"))
        except InvalidToken as exc:
            raise PermissionError("recovery key does not unlock this book") from exc
    raise ValueError("password or recovery_key required")


def encrypt_text(dek: bytes, plaintext: str) -> str:
    token = Fernet(dek).encrypt(plaintext.encode("utf-8"))
    return token.decode("ascii")


def decrypt_text(dek: bytes, ciphertext: str) -> str:
    try:
        return Fernet(dek).decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise PermissionError("decrypt failed") from exc


def keychain_service(project_slug: str, book_id: str) -> str:
    return f"storyworks.journal.{project_slug}.{book_id}"


def keychain_store(service: str, password: str) -> bool:
    try:
        import keyring

        keyring.set_password(service, "unlock", password)
        return True
    except Exception:
        return False


def keychain_load(service: str) -> Optional[str]:
    try:
        import keyring

        return keyring.get_password(service, "unlock")
    except Exception:
        return None


def book_crypto_public_meta(secrets: dict[str, str]) -> dict[str, Any]:
    """Fields safe to store in book.md (never the recovery key itself)."""
    return {
        "privacy": "private",
        "crypto_salt": secrets["salt"],
        "wrapped_dek_password": secrets["wrapped_dek_password"],
        "wrapped_dek_recovery": secrets["wrapped_dek_recovery"],
        "crypto_verifier": secrets["verifier"],
    }
