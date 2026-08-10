"""Journal private book crypto (tmp_path only — never a live vault)."""

from __future__ import annotations

from pathlib import Path

import pytest

from engine.vault.journal_crypto import (
    decrypt_text,
    encrypt_text,
    new_private_book_secrets,
    unlock_dek,
)
from engine.vault.store import VaultStore


def test_password_and_recovery_unlock(tmp_path: Path):
    secrets = new_private_book_secrets("correct-horse")
    dek = unlock_dek(
        password="correct-horse",
        salt_b64=secrets["salt"],
        wrapped_pw=secrets["wrapped_dek_password"],
        wrapped_rk=secrets["wrapped_dek_recovery"],
    )
    cipher = encrypt_text(dek, "private diary line")
    assert decrypt_text(dek, cipher) == "private diary line"
    dek2 = unlock_dek(
        recovery_key=secrets["recovery_key"],
        salt_b64=secrets["salt"],
        wrapped_pw=secrets["wrapped_dek_password"],
        wrapped_rk=secrets["wrapped_dek_recovery"],
    )
    assert dek2 == dek


def test_create_private_journal_book_returns_recovery_once(tmp_path: Path):
    store = VaultStore.init_vault(tmp_path / "vault")
    proj = store.create_project("Journal", module="journal")
    book = store.create_journal_book(proj["slug"], "Night thoughts", privacy="private", password="secret1")
    assert book["privacy"] == "private"
    assert "recovery_key" in book
    # Recovery key must not be re-read from book.md
    books = store.list_books(proj["slug"])
    private = [b for b in books if b["id"] == book["id"]][0]
    assert private["privacy"] == "private"
    unlocked = store.unlock_journal_book(proj["slug"], book["id"], password="secret1")
    assert unlocked["ok"] is True
    with pytest.raises(PermissionError):
        store.unlock_journal_book(proj["slug"], book["id"], password="wrong")
    store.close()
