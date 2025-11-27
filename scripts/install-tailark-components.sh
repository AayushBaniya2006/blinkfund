#!/bin/bash

# Script to install all Tailark components (excluding mist components)
# Usage: ./scripts/install-tailark-components.sh

# Array of all non-mist Tailark component names
components=(
  "call-to-action-1"
  "call-to-action-2"
  "call-to-action-3"
  "comparator-1"
  "content-1"
  "content-2"
  "content-3"
  "content-4"
  "content-5"
  "content-6"
  "content-7"
  "faqs-1"
  "faqs-2"
  "faqs-3"
  "faqs-4"
  "features-1"
  "features-2"
  "features-3"
  "hero-1"
  "hero-2"
  "login-1"
  "pricing-1"
  "pricing-2"
  "testimonials-1"
  "testimonials-2"
)

# Install each component
for component in "${components[@]}"; do
  echo "Installing @tailark/$component..."
  pnpm dlx shadcn add "@tailark/$component" --overwrite --yes
done

echo "✅ All Tailark components installed successfully!"

