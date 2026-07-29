# Face recognition models

Copied from `@vladmandic/human`. Served locally rather than from a CDN so the kiosk
keeps working without internet — a gate device on flaky wifi must still be able to
identify people.

~10 MB total, downloaded once by the browser and then cached. `faceres` (6.7 MB) is the
embedding model and is the one that actually does recognition; the rest are detection,
mesh and anti-spoofing.

Regenerate after upgrading the package:

```sh
cp node_modules/@vladmandic/human/models/{blazeface,facemesh,faceres,antispoof,liveness}.{json,bin} public/human-models/
```

These are binary weights, not source. If repo size matters, gitignore this directory and
run the copy in your build step instead.
