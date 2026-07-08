import useAxiosPrivate from './useAxiosPrivate';

/**
 * Payment helpers:
 *
 *   checkout(...)  – online: creates a PayMongo QR Ph session and redirects.
 *   payCash(...)   – on-site: records a pending CASH payment (Pay at Parish),
 *                    no redirect; returns { paymentId, amount, status }.
 *
 * Usage:
 *   const { checkout, payCash } = usePayment();
 *   await checkout({ amount, description, serviceType, referenceId });
 *   const res = await payCash({ amount, description, serviceType, referenceId });
 */
export default function usePayment() {
    const axios = useAxiosPrivate();

    const checkout = async ({ amount, description, serviceType, referenceId }) => {
        const res = await axios.post('/payment/checkout', {
            amount,
            description,
            serviceType,
            referenceId
        });
        // Redirect the user to PayMongo's hosted QR Ph checkout page
        window.location.href = res.data.checkoutUrl;
    };

    const payCash = async ({ amount, description, serviceType, referenceId }) => {
        const res = await axios.post('/payment/cash', {
            amount,
            description,
            serviceType,
            referenceId
        });
        return res.data;
    };

    return { checkout, payCash };
}
