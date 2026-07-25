#!/bin/zsh

set -euo pipefail

repository_directory="${0:A:h}"
exec zsh "${repository_directory}/scripts/run-aura-event.zsh"
