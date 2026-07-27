import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hash("__questorylabs_dummy_timing__", ARGON2_OPTS);
  }
  return dummyHashPromise;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Always runs a verify to keep login timing similar for unknown emails. */
export async function dummyPasswordVerify(password: string): Promise<void> {
  const h = await getDummyHash();
  try {
    await verify(h, password);
  } catch {
    // ignore
  }
}
