import crypto from "crypto";

const HASH_KEY_LENGTH = 64;
const SESSION_BYTES = 48;
const TOKEN_DELIMITER = ":";

export const hashPassword = async (password) =>
  new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, HASH_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}${TOKEN_DELIMITER}${derivedKey.toString("hex")}`);
    });
  });

export const verifyPassword = async (password, passwordHash) =>
  new Promise((resolve, reject) => {
    const [salt, storedHash] = passwordHash.split(TOKEN_DELIMITER);

    if (!salt || !storedHash) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, HASH_KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      const storedBuffer = Buffer.from(storedHash, "hex");
      const derivedBuffer = Buffer.from(derivedKey.toString("hex"), "hex");

      if (storedBuffer.length !== derivedBuffer.length) {
        resolve(false);
        return;
      }

      resolve(crypto.timingSafeEqual(storedBuffer, derivedBuffer));
    });
  });

export const generateToken = () => crypto.randomBytes(SESSION_BYTES).toString("hex");

export const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
