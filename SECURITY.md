# Security Guidelines

## ⚠️ IMPORTANT: Never Commit Credentials

This repository contains sensitive information that must **NEVER** be committed to version control.

## Files That Must Never Be Committed

### 1. `setup-actual-cloud-db.js`
This file contains **real database credentials** for the Aiven cloud PostgreSQL service.

**What to do:**
- ✅ This file is already in `.gitignore`
- ✅ Keep your actual credentials in `setup-actual-cloud-db.js` (local only)
- ✅ Use `setup-actual-cloud-db.example.js` as a template (this is safe to commit)
- ❌ **NEVER** commit `setup-actual-cloud-db.js`

### 2. `.env` files
All environment variable files are ignored:
- `.env`
- `.env.local`
- `.env.*.local`

### 3. Database Credentials
Never hardcode:
- Database passwords
- API keys
- JWT secrets
- Connection strings with credentials

## If You Accidentally Committed Credentials

1. **IMMEDIATELY rotate the exposed credentials** (change passwords, regenerate keys)
2. Remove the file from Git history using `git filter-repo` or BFG Repo-Cleaner
3. Force push to update the remote repository

## Security Best Practices

1. Always use environment variables via `.env` files
2. Use `setup-actual-cloud-db.example.js` as a template
3. Never commit real credentials, even in example files
4. Review `git diff` before committing
5. Use GitHub's secret scanning features

## Current Protection

- ✅ `setup-actual-cloud-db.js` is in `.gitignore`
- ✅ `.env` files are in `.gitignore`
- ✅ Example template file (`setup-actual-cloud-db.example.js`) is safe to commit

