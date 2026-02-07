
// This declaration file helps the IDE understand Deno globals without needing the Deno extension.
// It is intended for development environment compatibility.

declare var Deno: {
    env: {
        get(key: string): string | undefined;
    };
};

// Declare module for URL imports to suppress "Cannot find module" errors
declare module "https://deno.land/std@0.168.0/http/server.ts" {
    export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
    export function createClient(url: string, key: string, options?: any): any;
}
