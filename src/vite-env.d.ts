/// <reference types="vite/client" />

// Allow dynamic CDN imports used for jsqr
declare module 'https://cdn.skypack.dev/jsqr@1.4.0' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsQR: any
  export default jsQR
}
