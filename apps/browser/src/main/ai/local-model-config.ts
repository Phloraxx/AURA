export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const DEFAULT_LOCAL_MODEL = 'qwen3.5:4b-mlx';
export const DEFAULT_LOCAL_CONTEXT = 8_192;

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

export interface LocalModelConfig {
  baseUrl: string;
  contextLength: number;
  model: string;
}

export function resolveLocalModelConfig(
  environment: NodeJS.ProcessEnv = process.env,
): LocalModelConfig {
  return {
    baseUrl: (
      environment.AURA_OLLAMA_URL?.trim() || DEFAULT_OLLAMA_URL
    ).replace(/\/$/, ''),
    contextLength: boundedInteger(
      environment.AURA_LOCAL_CONTEXT,
      DEFAULT_LOCAL_CONTEXT,
      4_096,
      262_144,
    ),
    model: environment.AURA_LOCAL_MODEL?.trim() || DEFAULT_LOCAL_MODEL,
  };
}

export function resolveLocalTimeout(
  value: string | undefined,
  fallback: number,
): number {
  return boundedInteger(value, fallback, 1_000, 120_000);
}
