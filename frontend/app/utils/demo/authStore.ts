/**
 * Accounts for the static demo, kept in localStorage.
 * Mirrors /api/auth/signin and /api/auth/signup (backend/app/api/routes.py).
 */
import type { AuthResponse, AuthUser } from "../api";

const USERS_KEY = "medicograph_demo_users";

interface StoredUser extends AuthUser {
  hash: string;
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`medicograph:${password}`);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `plain:${password}`;
}

async function loadUsers(): Promise<StoredUser[]> {
  try {
    const stored = JSON.parse(localStorage.getItem(USERS_KEY) ?? "null") as StoredUser[] | null;
    if (stored?.length) return stored;
  } catch {
    // fall through to seeding
  }
  // Same seeded clinician as the backend: admin@medicograph.dev / admin123
  const seeded: StoredUser[] = [
    { email: "admin@medicograph.dev", name: "Dr. Admin", role: "clinician", hash: await hashPassword("admin123") },
  ];
  saveUsers(seeded);
  return seeded;
}

function saveUsers(users: StoredUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // storage unavailable: accounts last for this page view only
  }
}

function issueToken(email: string): string {
  const payload = btoa(JSON.stringify({ sub: email, exp: Math.floor(Date.now() / 1000) + 86400 }));
  return `demo.${payload}.signature`;
}

const toResponse = (user: StoredUser): AuthResponse => ({
  access_token: issueToken(user.email),
  token_type: "bearer",
  user: { email: user.email, name: user.name, role: user.role },
});

export async function signin(email: string, password: string): Promise<AuthResponse> {
  const users = await loadUsers();
  const user = users.find((u) => u.email === email.toLowerCase().trim());
  if (!user || user.hash !== (await hashPassword(password))) {
    throw new Error("Invalid email or password. Please try again.");
  }
  return toResponse(user);
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  if (password.length < 8) throw new Error("Password must be at least 8 characters long.");
  if (!/[A-Z]/.test(password)) throw new Error("Password must contain at least one uppercase letter.");
  if (!/\d/.test(password)) throw new Error("Password must contain at least one digit.");

  const users = await loadUsers();
  const normalised = email.toLowerCase().trim();
  if (users.some((u) => u.email === normalised)) {
    throw new Error("An account with this email already exists.");
  }

  const user: StoredUser = { email: normalised, name: name.trim(), role: "clinician", hash: await hashPassword(password) };
  saveUsers([...users, user]);
  return toResponse(user);
}

/** The signed-in clinician's email, read from the stored session (the demo's equivalent of the JWT subject). */
export function currentEmail(): string | null {
  try {
    const token = localStorage.getItem("medicograph_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
