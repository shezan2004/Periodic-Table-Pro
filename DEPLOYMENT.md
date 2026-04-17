# Deployment Guide

## Option 1: GitHub Pages

1. Push project to a GitHub repository.
2. In repository settings, open Pages.
3. Set source to `Deploy from a branch`.
4. Select branch (usually `main`) and root folder.
5. Save and wait for the Pages URL.

## Option 2: Netlify

1. Drag-and-drop the project folder in Netlify Drop, or connect your Git repo.
2. Build command: leave empty (static project).
3. Publish directory: `.`
4. Deploy.

## Option 3: Vercel

1. Import the repository into Vercel.
2. Framework preset: `Other`.
3. Build command: none.
4. Output directory: `.`
5. Deploy.

## Important Notes

- Because this project uses JavaScript modules and `elements.json`, hosting via HTTP is recommended.
- Opening files via `file:///` may block `fetch` in some browsers; the app falls back to inline data if that happens.
