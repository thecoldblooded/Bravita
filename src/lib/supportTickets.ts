import { getEdgeFunctionHeaders } from "@/lib/auth/edgeFunctionHeaders";
import { supabase } from "@/lib/supabase";

export interface CreateSupportTicketInput {
    name: string;
    email: string;
    category: string;
    subject: string;
    message: string;
    captchaToken?: string | null;
}

export async function createSupportTicket(input: CreateSupportTicketInput, context: string) {
    const headers = await getEdgeFunctionHeaders(context);
    const { data, error } = await supabase.functions.invoke("create-support-ticket", {
        body: input,
        headers,
    });

    if (error) {
        throw error;
    }

    const ticket = (data as { ticket?: { id?: string } } | null)?.ticket;
    if (!ticket?.id) {
        throw new Error("Bilet oluşturuldu ancak ID alınamadı.");
    }

    return ticket;
}

