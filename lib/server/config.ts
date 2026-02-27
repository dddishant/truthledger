export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export function hasDatabase() {
  return Boolean(getOptionalEnv('DATABASE_URL'));
}

export function hasOpenAI() {
  return Boolean(getOptionalEnv('OPENAI_API_KEY'));
}

export function hasModulate() {
  return Boolean(getOptionalEnv('MODULATE_API_KEY') && getOptionalEnv('MODULATE_BASE_URL'));
}
