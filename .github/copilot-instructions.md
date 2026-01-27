# Project Instructions for GitHub Copilot

## Git Workflow
- **NEVER automatically commit or push to Git unless explicitly asked by the user**
- Only make file changes and edits
- User will handle `git add`, `git commit`, and `git push` manually
- Wait for explicit instruction like "push now" or "commit and push" before running git commands

## Code Style
- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Keep components small and focused

## Database
- All database changes must be done via Supabase migrations
- Never modify database directly in production
