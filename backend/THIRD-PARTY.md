# Bundled dependencies

- `vendor/jose`: jose 6.2.12, npm registry package, MIT license. The upstream LICENSE.md is included. SHA-512 package integrity: `9NiFmJEex0sy2Dk58j2UGBSHgUs2ypF9eZSu4L6vjOX3Dp96Sw1F3uL+H+D1sx02jZZdzUT0HgvCy59CuvXcWw==`.
- `vendor/yt-dlp.exe`: downloaded locally by `npm run setup -- --youtube`, excluded from Git. yt-dlp 2026.08.19, from the project's official GitHub release. SHA-256: `66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a`. This Windows binary includes third-party components; see the upstream [licensing information](https://github.com/yt-dlp/yt-dlp#licensing). Used only to retrieve public video metadata and subtitle references; not video files.
- YouTube's IFrame Player API loads from YouTube when a YouTube lecture is opened.

The dependency archives/binaries were verified against the registry/release-provided integrity values before use. No automatic dependency updates are performed.

- Noto Sans KR Variable: SIL Open Font License 1.1, installed through `@fontsource-variable/noto-sans-kr`; license is included in that npm package.
- Lucide icons: ISC license, installed through `lucide`; license is included in that npm package.
- Other npm dependencies retain the licenses included in their respective packages. The application does not relicense third-party dependencies or lecture material.
