"""
Utility script to generate a Telethon StringSession.
Run this locally or on your VPS to log in with your Telegram account (phone number + 2FA),
then copy the output session string into your .env file as TELEGRAM_SESSION_STRING.
"""

from telethon.sync import TelegramClient
from telethon.sessions import StringSession


def generate_session():
    print("=== Telegram StringSession Generator ===")
    api_id = input("Enter your TELEGRAM_API_ID: ").strip()
    api_hash = input("Enter your TELEGRAM_API_HASH: ").strip()

    if not api_id or not api_hash:
        print("API ID and API Hash are required!")
        return

    with TelegramClient(StringSession(), int(api_id), api_hash) as client:
        session_str = client.session.save()
        print("\nSUCCESS! Here is your TELEGRAM_SESSION_STRING:\n")
        print(session_str)
        print("\nCopy and paste this string into your backend/.env file.")


if __name__ == "__main__":
    generate_session()
