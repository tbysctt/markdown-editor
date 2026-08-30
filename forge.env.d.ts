/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare const __APP_VERSION__: string;

declare module '*.css?inline' {
  const content: string;
  export default content;
}
