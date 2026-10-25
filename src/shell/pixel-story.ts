/** Local code-native pixel scenery, using the running game's vine, sleeve and parchment palette. */
export const pixelClaude = `<image href="${import.meta.env.BASE_URL}assets/story/claude.png" x="-16" y="-12" width="32" height="24" style="image-rendering:pixelated"/>`;
export const pixelGiantHand = `<path fill="#332245" d="M-19-384h38v383h-38z"/><path fill="#6b477d" d="M-15-384h30v377h-30z"/><path fill="#d6ad67" d="M-21-13h42v8h-42z"/><path fill="#805039" d="M-21-5h42v29h-4v12h-9v-4H2v4h-9v-4h-7v-6h-7z"/><path fill="#c9956b" d="M-17-3h34v25h-4v10H7V19H3v13h-6V19h-4v9h-6V17h-4z"/><path fill="#e8bd92" d="M-14-1h26v5h-26zm-2 20h4v5h-4zm10 8h3v4h-3zm10 0h3v4H4zm10-4h3v4h-3z"/>`;
export const pixelBars = `<g class="pixel-cell-bars" fill="#e4d7ee"><path d="M263 49h2v34h-2zm7 0h2v34h-2zm7 0h2v34h-2zm7 0h2v34h-2z"/><path d="M261 66h27v2h-27z"/></g>`;
/** The landscape as separate depth layers, so a camera can slide them at different speeds. */
export function pixelLayers(dawn = false, stalkTile?: string) {
  const supplied = stalkTile?.includes("player-stem");
  const stalk = stalkTile
    ? `<defs><pattern id="stalk-tile" patternUnits="userSpaceOnUse" x="218.6" width="19.7" height="${supplied ? 88.65 : 12.5}"><image href="${stalkTile}" x="${supplied ? -19.7 : 0}" width="${supplied ? 59.1 : 19.7}" height="${supplied ? 88.65 : 12.5}"/></pattern></defs><rect x="218.6" y="-20" width="19.7" height="170" fill="url(#stalk-tile)"/>`
    : `<path fill="#244d3d" d="M222 150V9h13v141z"/><path fill="#7fb266" d="M225 150V9h7v141z"/><path fill="#9bc87a" d="M225 150V9h2v141z"/>`;
  return {
    sky: `<rect width="320" height="180" fill="${dawn ? "#a7c7cf" : "#75668f"}"/><rect y="94" width="320" height="86" fill="${dawn ? "#d9dcb8" : "#a193b4"}"/>
    <path fill="#ffe6ab" d="M57 17h14v3h5v14h-5v4H57v-4h-4V20h4z"/>
    <g class="pixel-twinkle" fill="#fff1c6">${Array.from({ length: 17 }, (_, i) => `<rect x="${(i * 43 + 11) % 320}" y="${(i * 19 + 8) % 90}" width="${i % 3 === 0 ? 2 : 1}" height="${i % 3 === 0 ? 2 : 1}" style="animation-delay:${(i * 0.37).toFixed(2)}s"/>`).join("")}</g>`,
    clouds: `<g fill="${dawn ? "#f8efdf" : "#b6a4c8"}"><path d="M13 43h12v-4h25v4h14v10H13zm115-16h10v-5h26v5h16v10h-52zm57 59h14v-4h27v4h17v9h-58z"/></g>`,
    far: `<path fill="#586279" d="M0 113h23v-6h28v-9h19v12h25v10h25v-8h28v-9h25v9h30v-6h35v14h82v60H0z"/>`,
    mid: `<path fill="#35594c" d="M0 136h28v-8h29v-5h30v11h24v-9h32v9h42v-8h32v13h103v41H0z"/>`,
    world: `<path fill="#594166" d="M250 39h9v-9h9v9h10v-9h9v9h9v-9h9v9h8v111h-63z"/>
    <path fill="#8a7297" d="M255 43h53v107h-53z"/><path fill="#b59bc0" d="M255 43h5v107h-5zm0 0h53v4h-53z"/>
    <path fill="#a58bb2" d="M264 90h12v3h-12zm25-8h14v3h-14zm-27 27h13v3h-13zm24 14h15v3h-15zm-20 15h10v3h-10z"/>
    <path fill="#291f3e" d="M266 45h16v4h7v35h-29V49h6zM272 121h17v6h5v23h-27v-23h5z"/>
    ${stalk}
    <path fill="#4e8850" d="M223 35h-8v-4h-7v-6h14v4h4zm8 25h10v-4h7v-6h-13v4h-4zm-8 32h-9v-4h-7v-7h14v5h5zm8 30h10v-4h7v-6h-13v4h-4z"/>
    <path fill="#244d3d" d="M20 150V91h5v59zm30 0v-42h4v42z"/><path fill="#487351" d="M6 98V79h10V67h15v12h10v19zm31 16V97h7V86h15v11h10v17z"/>
    <rect y="149" width="320" height="31" fill="#244d3d"/><rect y="149" width="320" height="5" fill="#9bc87a"/><rect y="154" width="320" height="3" fill="#4e8850"/>
    <path fill="#c3ad7f" d="M40 154h173v7H40zm-20 7h151v7H20z"/>
    <g fill="#b6d791">${Array.from({ length: 24 }, (_, i) => `<rect x="${(i * 23 + 8) % 320}" y="${161 + (i % 3) * 6}" width="3" height="2"/>`).join("")}</g>`,
  };
}
export function pixelLandscape(dawn = false): string {
  const l = pixelLayers(dawn);
  return l.sky + l.clouds + l.far + l.mid + l.world;
}
export function pixelTowerArt(freed = false): string {
  return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true">${pixelLandscape(freed)}<g transform="translate(274 70)">${pixelClaude}</g>${freed ? "" : pixelBars}</svg>`;
}
