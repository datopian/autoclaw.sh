import { useMemo } from "react";

export function useSubscriptionUrl(email?: string, tenantId?: string) {
    return useMemo(() => {
        const base = process.env.NEXT_PUBLIC_STRIPE_STARTER_URL;
        if (!base) {
            return "";
        }

        const url = new URL(base);
        if (email) {
            url.searchParams.set("prefilled_email", email);
        }
        if (tenantId) {
            url.searchParams.set("client_reference_id", tenantId);
            url.searchParams.set("tenant_id", tenantId);
        }

        return url.toString();
    }, [email, tenantId]);
}
