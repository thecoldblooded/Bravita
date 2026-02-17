/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// Lottie file type declaration
declare module '*.lottie' {
    const src: string;
    export default src;
}


