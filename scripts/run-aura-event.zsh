#!/bin/zsh

set -euo pipefail

script_directory="${0:A:h}"
repository_directory="${script_directory:h}"
app_binary="${repository_directory}/apps/browser/out/AURA-darwin-arm64/AURA.app/Contents/MacOS/AURA"
local_environment="${repository_directory}/.env"

if [[ -f "${local_environment}" ]]; then
  set -a
  source "${local_environment}"
  set +a
fi

if [[ ! -x "${app_binary}" ]]; then
  print -u2 "AURA.app is missing. Rebuild it from a Node environment with pnpm, or restore apps/browser/out/AURA-darwin-arm64/AURA.app."
  exit 1
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  read -r -s "OPENAI_API_KEY?Temporary OpenAI API key: "
  print
  export OPENAI_API_KEY
fi

export OPENAI_MODEL="${OPENAI_MODEL:-gpt-5.6-luna}"
export AURA_PAGE_REASONING_EFFORT="${AURA_PAGE_REASONING_EFFORT:-medium}"
export AURA_OLLAMA_URL="${AURA_OLLAMA_URL:-http://127.0.0.1:11434}"
export AURA_LOCAL_MODEL="${AURA_LOCAL_MODEL:-qwen3.5:4b-mlx}"
export AURA_LOCAL_CONTEXT="${AURA_LOCAL_CONTEXT:-8192}"
export AURA_LOCAL_CONVERSATION="${AURA_LOCAL_CONVERSATION:-1}"
export AURA_CONVERSATION_PROVIDER="${AURA_CONVERSATION_PROVIDER:-cloud}"
export AURA_TRANSCRIPTION_MODEL="${AURA_TRANSCRIPTION_MODEL:-gpt-4o-mini-transcribe}"

# Local Qwen is an acceleration layer, not a launch dependency. Give the event
# operator an immediate preflight signal while preserving deterministic/cloud
# fallback if Ollama is stopped or the model tag is missing.
if command -v curl >/dev/null 2>&1; then
  tags="$(curl --silent --show-error --max-time 2 "${AURA_OLLAMA_URL}/api/tags" 2>/dev/null || true)"
  if [[ -z "${tags}" ]]; then
    print -u2 "AURA warning: Ollama is not responding at ${AURA_OLLAMA_URL}; deterministic/cloud paths will still work."
  elif [[ "${tags}" != *"${AURA_LOCAL_MODEL}"* ]]; then
    print -u2 "AURA warning: ${AURA_LOCAL_MODEL} was not found in Ollama; deterministic/cloud paths will still work."
  else
    print "AURA local fast path: ${AURA_LOCAL_MODEL} is available."
  fi
fi

exec "${app_binary}"
