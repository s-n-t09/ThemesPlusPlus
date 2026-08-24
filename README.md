# Themes++

<div align="center">
  <h1>Themes++</h1>
  <p><strong>A maintained repair edition of Themes+ for Revenge, Kettu, and compatible Vendetta-based Discord clients.</strong></p>
  <p>
    <a href="https://s-n-t09.github.io/ThemesPlusPlus/"><img alt="Installation page" src="https://img.shields.io/badge/installation-page-5865F2?style=for-the-badge&logo=github" /></a>
    <a href="https://github.com/s-n-t09/ThemesPlusPlus/actions"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/s-n-t09/ThemesPlusPlus/build.yml?style=for-the-badge&label=build" /></a>
  </p>
</div>

Themes++ repairs and improves the theme enhancement workflow for mobile Discord modding clients based on Vendetta. It is designed for users who want custom theme colors, icon overlays, theme-driven icon packs, and manually selected custom icon packs to keep working across newer client builds.

## What is fixed

| Area | Themes++ behavior |
| --- | --- |
| Custom icon packs | Uses a function-component-safe image hook, normalizes file paths, and supports common third-party pack layouts. |
| Built-in icon packs | Ships with a local iconpack index and file trees, so a temporary outage in the original repository does not immediately disable icon replacement. |
| Network failures | Keeps the last successful response in the local cache and handles list/config/tree failures independently. |
| Themes without icon packs | Falls back cleanly to Discord icons while allowing other theme enhancements to remain active. |
| Plugin lifecycle | Prevents asynchronous load errors and stale loading states from leaving the settings screen stuck. |
| Client compatibility | Targets Revenge, Kettu, and compatible Vendetta-based clients that expose the standard plugin API. |

## Installation

**Installation URL:** [`https://s-n-t09.github.io/ThemesPlusPlus/install.js`](https://s-n-t09.github.io/ThemesPlusPlus/install.js)

1. Copy the installation URL above.
2. Open Discord, then go to **Settings → Plugins**.
3. Press the **+** button to start adding a plugin.
4. Paste the URL and press **Install**.
5. If a confirmation prompt appears, press **Confirm**.

The [installation page](https://s-n-t09.github.io/ThemesPlusPlus/) contains the same instructions and a direct installation button for reference.

## Configuration

After installation, open the Themes++ settings panel. **Automatic** mode follows the iconpack selected by the active theme. **Manual** mode lets you choose a bundled iconpack or provide a custom base URL. **Disabled** mode leaves the Discord default icons in place while preserving the other available theme enhancements.

For modern custom packs, enter the directory containing the generated icon files and leave the filename suffix empty. Themes++ accepts either a URL with or without a trailing slash and keeps legacy suffix support for older iOS-oriented packs.

## Compatibility and scope

Themes++ is a repair-focused continuation of the original Themes+ implementation. It does not bundle icon artwork from third-party creators; the iconpack index preserves each pack's upstream source and credit metadata. Client internals can change over time, so behavior may vary between Discord versions and mod builds.

## Development

The repository contains a small esbuild-based build script. Install dependencies and build the distributable files with:

```sh
pnpm install
pnpm build
```

The generated files are written to `dist/`. The GitHub Actions workflow rebuilds the plugin and publishes `dist/` to GitHub Pages on changes to the source, iconpack data, or build configuration.

## Author

Themes++ is authored and maintained by **S.N.T** (`1444349574859980881`).

## License and attribution

Themes++ is an independent repair edition inspired by the public Themes+ implementation. Third-party iconpack assets remain subject to their respective upstream licenses and attribution requirements.
