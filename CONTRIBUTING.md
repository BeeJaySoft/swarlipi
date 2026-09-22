# Contributing to Swarlipi

Thanks for helping. Two things about this repository first:

- **It is a mirror.** Swarlipi is developed inside a private monorepo, alongside
  the notation app it grew out of. This repository is that package directory,
  pushed on every release and whenever the package changes. Issues and pull
  requests belong here all the same.
- **Pull requests are applied upstream, not merged here.** Once reviewed, your
  commits are applied to the monorepo with your authorship kept, land here with
  the next push, and the pull request is closed with a pointer to the commit.

## Before opening a pull request

- `pnpm install`, then `pnpm test`, `pnpm typecheck` and `pnpm docs:build` pass.
- The rendered markup and the class names in `src/index.css` are public API
  (see the top of `CHANGELOG.md`). A change that could break a consumer's CSS
  needs an entry there under "Unreleased".
- New scripts are added only on primary-source evidence that Bhatkhande
  notation is published in them; the Gujarati entry in `CHANGELOG.md` shows
  what that evidence looks like. Please open an issue with the evidence first.

## Fonts

`fonts/` is built, not committed. `pnpm build:fonts` runs
`scripts/build-fonts.py`, which needs Python 3 with fontTools (the script's
header lists the exact requirements) and downloads the pinned Noto sources on
its first run. `scripts/calibrate.py --check` guards the per-script mark
calibration in `src/index.css`; run it whenever a Noto pin or a script changes.

The "Source and contributing" section of the README is the short version of
all this.
