import { hashPassword } from "../src/lib/auth/password-hash";

const plain = process.argv[2];

if (!plain) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}

console.log(await hashPassword(plain));
