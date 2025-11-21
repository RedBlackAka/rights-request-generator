# Rights Request Generator

Generate GDPR Article 14/17 requests and Norwegian right-to-cancel (Angrerett) letters directly in the browser. This project delivers a static, privacy-friendly web tool that never sends your data to a server.

## Features

- **Two ready-made letter templates**: GDPR (information or erasure) and Angrerett cancellation.
- **Real-time preview**: Letters render instantly as you type.
- **Localization**: English and Norwegian Bokmål with easily extendable JSON translations.
- **Dark-themed UI**: Responsive, accessible design tuned for clarity.
- **Clipboard helper**: Copies the generated letter using the modern Clipboard API with fallback support.

## Getting Started

1. Clone and enter the repository:

   ```bash
   git clone https://github.com/Kf637/rights-request-generator.git
   cd rights-request-generator
   ```

2. Serve the static site. You can use any static file server; for example:

   ```bash
   npx serve .
   ```

   Then open the printed localhost URL in your browser.

## Docker Image

A Dockerfile is provided to host the static site with nginx.

```bash
docker build -t ghcr.io/kf637/rights-request-generator .
docker run -p 3000:3000 ghcr.io/kf637/rights-request-generator
```

Visit `http://localhost:3000` to use the generator.


## Localization

Translations live in `translations/*.json`. Add a new language by:

1. Creating `translations/<lang>.json` with the same structure as `en.json`.
2. Adding an entry to `translations/languages.json` pointing to the new file.

The UI will automatically pick up the new language at load time.

## Project Structure

```
.
├── index.html          # Application markup with localization attributes
├── style.css           # Dark theme and layout styling
├── script.js           # Localization loader, state management, rendering
├── translations/       # Language packs and manifest
├── Dockerfile          # nginx-based image for static hosting
├── .dockerignore       # Docker build context exclusions
└── .github/workflows/  # CI pipelines
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
