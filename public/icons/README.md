# SlangFlow PWA icons

`icon.svg` is the master asset. To generate the PNG variants referenced by
`vite.config.ts` (manifest) run a one-off conversion locally:

```bash
# Using imagemagick (or any tool you prefer):
convert -background none -resize 192x192 public/icons/icon.svg public/icons/icon-192.png
convert -background none -resize 512x512 public/icons/icon.svg public/icons/icon-512.png
# For the maskable variant, pad ~10% so the safe-zone is respected:
convert -background "#0a0a0a" -resize 410x410 public/icons/icon.svg \
        -gravity center -extent 512x512 public/icons/icon-maskable-512.png
```

The PNGs are intentionally not committed; CI/deploy should produce them or
you can hand-export from a design tool. The PWA install prompt will still
work with the SVG alone in most Chromium browsers, but PNG fallbacks
maximise compatibility (Safari, older Android, etc.).
