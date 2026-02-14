import { supabase } from './supabase';

interface BillionMailContact {
    email: string;
    first_name?: string;
    last_name?: string;
    attributes?: Record<string, unknown>;
    tags?: string[];
}

class BillionMailService {
    /**
     * Syncs a contact to BillionMail via Supabase Edge Function to avoid CORS and hide API keys.
     */
    async subscribeContact(contact: BillionMailContact) {

        try {
            const { data, error } = await supabase.functions.invoke('sync-to-billionmail', {
                body: { contact }
            });

            if (error) {
                console.error('BillionMail: Edge Function returned error.');
                throw error;
            }


            return data;
        } catch (error) {
            console.error('BillionMail: Sync failed.');
            // Non-blocking for the user
            return null;
        }
    }

    /**
     * Sends a transactional email via BillionMail. 
     * In the future, this can also be moved to an Edge Function for security.
     */
    async sendTransactionalEmail(templateId: string, recipient: string, params: Record<string, unknown> = {}) {
        // Placeholder for future implementation if needed via Edge Functions
        console.warn('sendTransactionalEmail not yet implemented via Edge Functions');
        return null;
    }
}

export const billionMail = new BillionMailService();
