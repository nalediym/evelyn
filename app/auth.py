"""WebAuthn authentication helpers.

Uses py_webauthn for registration and authentication ceremonies.
For MVP, the relying party is localhost.
"""

import base64
import json
from dataclasses import dataclass

from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

RP_ID = "localhost"
RP_NAME = "Evelyn"
ORIGIN = "http://localhost:8000"

# In-memory challenge store (keyed by a session token).
# Good enough for MVP; move to Redis / DB for production.
_challenges: dict[str, bytes] = {}


def store_challenge(session_id: str, challenge: bytes):
    _challenges[session_id] = challenge


def pop_challenge(session_id: str) -> bytes:
    return _challenges.pop(session_id, b"")


# ── registration ──────────────────────────────────────────────


def create_registration_options(user_id: str, username: str):
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=user_id.encode(),
        user_name=username,
        user_display_name=username,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    return options


def verify_registration(credential_json: dict, expected_challenge: bytes):
    return verify_registration_response(
        credential=credential_json,
        expected_challenge=expected_challenge,
        expected_rp_id=RP_ID,
        expected_origin=ORIGIN,
    )


# ── authentication ────────────────────────────────────────────


def create_authentication_options(credential_ids: list[bytes]):
    allow_credentials = [
        PublicKeyCredentialDescriptor(id=cid) for cid in credential_ids
    ]
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials if credential_ids else None,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    return options


def verify_authentication(
    credential_json: dict,
    expected_challenge: bytes,
    credential_public_key: bytes,
    credential_current_sign_count: int,
):
    return verify_authentication_response(
        credential=credential_json,
        expected_challenge=expected_challenge,
        expected_rp_id=RP_ID,
        expected_origin=ORIGIN,
        credential_public_key=credential_public_key,
        credential_current_sign_count=credential_current_sign_count,
    )
