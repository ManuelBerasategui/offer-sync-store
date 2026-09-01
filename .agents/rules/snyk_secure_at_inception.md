# Snyk "Secure at Inception" Guidelines

This project enforces Snyk's **Secure at Inception** paradigm. All code, modifications, and AI generation must adhere to proactive security guardrails before merging or executing.

## Core Directives

### 1. Static Application Security Testing (SAST) Guardrails
- **Input Validation & Sanitization**: Validate all inputs using schemas (e.g. Zod) and sanitize user data before rendering to prevent XSS.
- **SQL & Data Security**: Never interpolate unescaped parameters into database queries. Rely strictly on Supabase client methods and parameterized queries with Row Level Security (RLS) enabled.
- **Authentication & Authorization**: Verify user authentication state on protected routes and sensitive actions. Never trust client-provided roles or permissions without server/database-side validation.
- **Secrets & Credentials**: Never hardcode API keys, tokens, or private secrets in source code. Use environment variables with appropriate `.env` exclusions.

### 2. Software Composition Analysis (SCA) Guardrails
- **Dependency Hygiene**: When adding or updating npm/bun packages, ensure they come from trusted registries and do not contain known CVEs.
- **Minimal Surface**: Avoid bloated or unnecessary dependencies that expand the attack surface.

### 3. Edge Functions & API Security
- Secure all Supabase Edge Functions (`supabase/functions/`) with appropriate CORS headers, authentication checks, and rate limiting where applicable.
- Validate payload structures and handle exceptions without leaking internal stack traces or database errors to the client.
