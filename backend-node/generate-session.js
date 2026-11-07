import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";
import dotenv from "dotenv";

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || (await input.text("Enter API ID: ")));
const apiHash = process.env.TELEGRAM_API_HASH || (await input.text("Enter API Hash: "));

const stringSession = new StringSession("");
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

async function main() {
  console.log("=== Telegram GramJS Session Generator ===");
  await client.start({
    phoneNumber: async () => await input.text("Enter your phone number (with country code): "),
    password: async () => await input.text("Enter your 2FA password (if enabled): "),
    phoneCode: async () => await input.text("Enter the verification code sent to Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("\nSUCCESS! Logged in successfully.");
  console.log("\nYour TELEGRAM_SESSION_STRING is:\n");
  console.log(client.session.save());
  console.log("\nCopy and paste this into your backend-node/.env file.\n");
  await client.disconnect();
  process.exit(0);
}

main().catch(console.error);
