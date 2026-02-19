// This declaration file helps the IDE understand Deno globals without needing the Deno extension.
// It is intended for development environment compatibility.

declare const Deno: {
    env: {
        get(key: string): string | undefined;
    };
};

declare module "https://deno.land/std@0.168.0/http/server.ts" {
    export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function createClient(url: string, key: string, options?: any): any;
}
