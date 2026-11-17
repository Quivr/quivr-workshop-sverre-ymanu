# Ask Quivr workshop task runner
# Docs: https://just.systems/man/en/
#
# Run `just` without arguments to list all available recipes.

set shell := ["bash", "-uc"]

# List all available recipes
default:
    @just --list

########################################################################################################
# Setup & Environment
########################################################################################################
# Boilerplate setup: switch to the .nvmrc node version (prefers fnm, falls back to nvm), enable corepack, install dependencies and create .env
[group('setup')]
setup:
    #!/usr/bin/env bash
    set -euo pipefail

    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if command -v fnm >/dev/null 2>&1; then
        eval "$(fnm env --shell bash)"
        if ! fnm use; then
            echo "Node $(cat .nvmrc) is not installed yet, installing it..." >&2
            fnm install && fnm use
        fi
    elif [ -s "$NVM_DIR/nvm.sh" ]; then
        \. "$NVM_DIR/nvm.sh"
        if ! nvm use; then
            echo "Node $(cat .nvmrc) is not installed yet, installing it..." >&2
            nvm install
        fi
    elif command -v node >/dev/null 2>&1; then
        echo "Neither fnm nor nvm found, using existing $(command -v node) (node $(node -v))" >&2
    else
        echo 'No node version manager found. Install fnm via https://github.com/Schniz/fnm or nvm via https://github.com/nvm-sh/nvm' >&2
        exit 1
    fi

    corepack enable
    yarn install --immutable
    if [ ! -f .env ]; then
        cp .env.example .env
        echo 'Created .env from .env.example. Add your ANTHROPIC_API_KEY to it.'
    fi

# Log in to Quivr and save the token to .env (your password is never stored)
[group('setup')]
login:
    yarn workspace mcp login

# Revoke your Quivr token and remove it from .env (run this at the end of the workshop)
[group('setup')]
logout:
    yarn workspace mcp logout

# Check that everything is set up: node, env, Anthropic, Quivr and the MCP server
[group('setup')]
doctor:
    yarn doctor

########################################################################################################
# Development
########################################################################################################
# Start mcp (3002), agent (3001) and frontend (http://localhost:5173) in watch mode
[group('dev')]
dev:
    yarn dev

# Start OpenCode with the workshop models and the API key from .env
[group('dev')]
opencode *ARGS:
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env; set +a
    exec opencode {{ ARGS }}

# Open the MCP Inspector against the running MCP server (http://localhost:3002/mcp)
[group('dev')]
inspector:
    yarn workspace mcp inspector

# Record fixtures from the live backend and anonymise them (needs `just login`)
[group('dev')]
record-fixtures:
    yarn workspace mcp record-fixtures

# Generate TypeScript types for apps/mcp/src/quivr/queries/*.graphql
[group('dev')]
gql-gen:
    yarn workspace mcp codegen

########################################################################################################
# Code Quality & Evals
########################################################################################################
# Lint the monorepo with eslint (extra args are passed through, e.g. `just lint --fix`)
[group('quality')]
lint *ARGS:
    yarn lint {{ ARGS }}

# Type-check every app
[group('quality')]
typecheck:
    yarn typecheck

# Run the unit tests
[group('quality')]
test:
    yarn test

# Run the eval suite against the recorded fixtures
[group('quality')]
eval:
    yarn eval

# Write evals/results/REPORT.md (per model: scores, latency, tokens, cost; low judge scores) from the last eval runs
[group('quality')]
eval-report:
    yarn workspace evals report

# Open the eval UI in watch mode
[group('quality')]
eval-ui:
    yarn eval:watch
