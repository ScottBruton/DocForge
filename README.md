# DocForge

Structured document creator/editor built with Tauri v2, React, and a JSON document model.

## Tech Stack

- Tauri v2, React, TypeScript, Vite, TailwindCSS
- Zustand, dnd-kit, TipTap, SQLite, OpenAI API
- Python Word COM bridge (Windows)

## Development

```bash
npm install
cp .env.example .env   # then add your OpenAI key
npm run tauri dev
```

### OpenAI API key

Create a `.env` file in the project root (already gitignored):

```env
VITE_OPENAI_API_KEY=sk-your-key-here
```

Restart the dev server after changing `.env`. The key can also be entered in **Settings** and is stored locally via Tauri; `.env` takes precedence when set.

## Project Structure

Each project is saved as a folder:

```
project-name/
  document.json
  styles.json
  assets/
  thumbnails/
  metadata.db
```

## Word COM Bridge

```bash
cd python-bridge
pip install -r requirements.txt
```

## Tests

```bash
npm test
```
