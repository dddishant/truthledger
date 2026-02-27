function isPresent(value?: string) {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  const placeholders = ['xxxx', 'your_password', 'sk-...', 'tvly-...', '...'];
  return !placeholders.some((p) => v.includes(p));
}

export function hasNeo4jConfig() {
  return isPresent(process.env.NEO4J_URI) && isPresent(process.env.NEO4J_USER) && isPresent(process.env.NEO4J_PASSWORD);
}

export function hasOpenAIConfig() {
  return isPresent(process.env.OPENAI_API_KEY);
}

export function hasTavilyConfig() {
  return isPresent(process.env.TAVILY_API_KEY);
}

export function inMockMode() {
  return !hasNeo4jConfig();
}
