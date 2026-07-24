#!/bin/zsh

set -euo pipefail

script_directory="${0:A:h}"
repository_directory="${script_directory:h}"
app_binary="${repository_directory}/apps/browser/out/AURA-darwin-arm64/AURA.app/Contents/MacOS/AURA"

if [[ ! -x "${app_binary}" ]]; then
  print -u2 "AURA.app is missing. Run: corepack pnpm browser:package:mac"
  exit 1
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  read -r -s "OPENAI_API_KEY?Temporary OpenAI API key: "
  print
  export OPENAI_API_KEY
fi

export OPENAI_MODEL="${OPENAI_MODEL:-gpt-5.6-luna}"
export AURA_PAGE_REASONING_EFFORT="${AURA_PAGE_REASONING_EFFORT:-medium}"
exec "${app_binary}"
