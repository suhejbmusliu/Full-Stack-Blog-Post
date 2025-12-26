import speakeasy from "speakeasy";
import qrcode from "qrcode";

export function generate2FASecret(email) {
  const secret = speakeasy.generateSecret({
    name: `ShoqataDituria (${email})`,
    length: 20,
  });
  return secret; // { base32, otpauth_url, ... }
}

export async function makeQRCodeDataUrl(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

export function verify2FAToken(secretBase32, token) {
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token,
    window: 1,
  });
}
