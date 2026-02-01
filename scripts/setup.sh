#!/bin/bash

# Agent Trainer Setup Script
# This script creates the required KV namespaces and updates wrangler.toml

set -e

echo "Agent Trainer Setup"
echo "==================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI is not installed."
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "You need to login to Cloudflare first."
    echo "Running: wrangler login"
    wrangler login
fi

echo ""
echo "Creating KV namespaces..."
echo ""

# Create AGENTS_KV namespace
echo "Creating AGENTS_KV namespace..."
AGENTS_OUTPUT=$(wrangler kv:namespace create "AGENTS_KV" 2>&1)
AGENTS_ID=$(echo "$AGENTS_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")

if [ -z "$AGENTS_ID" ]; then
    # Try alternative pattern
    AGENTS_ID=$(echo "$AGENTS_OUTPUT" | grep -oP '"id":\s*"\K[^"]+' || echo "")
fi

if [ -z "$AGENTS_ID" ]; then
    echo "Warning: Could not extract AGENTS_KV namespace ID automatically."
    echo "Output was: $AGENTS_OUTPUT"
    echo ""
    read -p "Please enter the AGENTS_KV namespace ID manually: " AGENTS_ID
fi

echo "AGENTS_KV namespace ID: $AGENTS_ID"

# Create AGENTS_KV preview namespace
echo "Creating AGENTS_KV preview namespace..."
AGENTS_PREVIEW_OUTPUT=$(wrangler kv:namespace create "AGENTS_KV" --preview 2>&1)
AGENTS_PREVIEW_ID=$(echo "$AGENTS_PREVIEW_OUTPUT" | grep -oP 'preview_id = "\K[^"]+' || echo "")

if [ -z "$AGENTS_PREVIEW_ID" ]; then
    AGENTS_PREVIEW_ID=$(echo "$AGENTS_PREVIEW_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")
fi

if [ -z "$AGENTS_PREVIEW_ID" ]; then
    echo "Warning: Could not extract AGENTS_KV preview namespace ID automatically."
    read -p "Please enter the AGENTS_KV preview namespace ID manually: " AGENTS_PREVIEW_ID
fi

echo "AGENTS_KV preview namespace ID: $AGENTS_PREVIEW_ID"

# Create TRAINING_JOBS_KV namespace
echo ""
echo "Creating TRAINING_JOBS_KV namespace..."
TRAINING_OUTPUT=$(wrangler kv:namespace create "TRAINING_JOBS_KV" 2>&1)
TRAINING_ID=$(echo "$TRAINING_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")

if [ -z "$TRAINING_ID" ]; then
    TRAINING_ID=$(echo "$TRAINING_OUTPUT" | grep -oP '"id":\s*"\K[^"]+' || echo "")
fi

if [ -z "$TRAINING_ID" ]; then
    echo "Warning: Could not extract TRAINING_JOBS_KV namespace ID automatically."
    read -p "Please enter the TRAINING_JOBS_KV namespace ID manually: " TRAINING_ID
fi

echo "TRAINING_JOBS_KV namespace ID: $TRAINING_ID"

# Create TRAINING_JOBS_KV preview namespace
echo "Creating TRAINING_JOBS_KV preview namespace..."
TRAINING_PREVIEW_OUTPUT=$(wrangler kv:namespace create "TRAINING_JOBS_KV" --preview 2>&1)
TRAINING_PREVIEW_ID=$(echo "$TRAINING_PREVIEW_OUTPUT" | grep -oP 'preview_id = "\K[^"]+' || echo "")

if [ -z "$TRAINING_PREVIEW_ID" ]; then
    TRAINING_PREVIEW_ID=$(echo "$TRAINING_PREVIEW_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")
fi

if [ -z "$TRAINING_PREVIEW_ID" ]; then
    echo "Warning: Could not extract TRAINING_JOBS_KV preview namespace ID automatically."
    read -p "Please enter the TRAINING_JOBS_KV preview namespace ID manually: " TRAINING_PREVIEW_ID
fi

echo "TRAINING_JOBS_KV preview namespace ID: $TRAINING_PREVIEW_ID"

echo ""
echo "Updating wrangler.toml..."

# Update wrangler.toml with the namespace IDs
WRANGLER_FILE="wrangler.toml"

if [ ! -f "$WRANGLER_FILE" ]; then
    WRANGLER_FILE="../wrangler.toml"
fi

if [ ! -f "$WRANGLER_FILE" ]; then
    echo "Error: wrangler.toml not found"
    exit 1
fi

# Use sed to replace placeholder IDs
sed -i "s/your_kv_namespace_id/$AGENTS_ID/g" "$WRANGLER_FILE"
sed -i "s/your_preview_kv_namespace_id/$AGENTS_PREVIEW_ID/g" "$WRANGLER_FILE"
sed -i "s/your_training_jobs_kv_namespace_id/$TRAINING_ID/g" "$WRANGLER_FILE"
sed -i "s/your_preview_training_jobs_kv_namespace_id/$TRAINING_PREVIEW_ID/g" "$WRANGLER_FILE"

echo "wrangler.toml has been updated with your KV namespace IDs."

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set your HuggingFace API key:"
echo "   wrangler secret put HUGGINGFACE_API_KEY"
echo ""
echo "2. Deploy your worker:"
echo "   npm run deploy"
echo ""
echo "Your KV namespace IDs:"
echo "  AGENTS_KV:        $AGENTS_ID"
echo "  AGENTS_KV preview: $AGENTS_PREVIEW_ID"
echo "  TRAINING_JOBS_KV: $TRAINING_ID"
echo "  TRAINING_JOBS_KV preview: $TRAINING_PREVIEW_ID"
