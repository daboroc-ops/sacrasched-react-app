import useAxiosPrivate from './useAxiosPrivate';

/**
 * Returns a `checkout` function that:
 *  1. POSTs to /payment/checkout on the backend
 *  2. Creates a PayMongo checkout session (QRPH only)
 *  3. Redirects the browser to the PayMongo-hosted QR page
 *
 * Usage:
 *   const { checkout } = usePayment();
 *   await checkout({ amount, description, serviceType, referenceId });
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

    return { checkout };
}
