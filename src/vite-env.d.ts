/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// Lottie file type declaration
declare module '*.lottie' {
    const src: string;
    export default src;
}

// LordIcon custom element type definition
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'lord-icon': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & {
                    src?: string;
                    trigger?: string;
                    colors?: string;
                    stroke?: string;
                    state?: string;
                    style?: React.CSSProperties;
                },
                HTMLElement
            >;
        }
    }
}

export { };
