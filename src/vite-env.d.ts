/// <reference types="vite/client" />

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
