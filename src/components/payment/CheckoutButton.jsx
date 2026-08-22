import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Unified checkout button for all payment types via Base44 Payments.
 * Supports: Stripe, PayPal, Cash App, Chime, Apple Pay, Google Pay (all handled by the hosted checkout page).
 *
 * @param {string} payment_type - "merch" | "tickets" | "donation" | "support" | "subscription"
 * @param {string} artist_profile_id - Artist receiving the payment (optional for subscriptions)
 * @param {string} artist_name - Artist display name
 * @param {number} amount - Total amount in USD (for tickets/donation/support/subscription)
 * @param {array} items - Cart items (for merch: [{product_id, product_title, price, quantity, shipping_cost, variant, digital_file_url}])
 * @param {string} event_id - Event ID (for tickets)
 * @param {string} event_title - Event title (for tickets)
 * @param {number} quantity - Ticket quantity (for tickets)
 * @param {boolean} is_recurring - For support: true = monthly subscription, false = one-time
 * @param {string} plan_code - Subscription plan code (for subscription: "supporter", "premium_supporter", "champion", "founding_supporter")
 * @param {string} billing_cycle - Subscription billing cycle (for subscription: "monthly" | "annual")
 * @param {string} name - Subscription display name (for subscription)
 * @param {React.ReactNode} children - Button label content
 * @param {string} variant - Button variant
 * @param {string} className - Additional classes
 */
export default function CheckoutButton({
  payment_type,
  artist_profile_id,
  artist_name,
  amount,
  items,
  event_id,
  event_title,
  quantity,
  is_recurring = false,
  plan_code,
  billing_cycle = 'monthly',
  name,
  children,
  variant = 'default',
  className = '',
  disabled = false,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (disabled || loading) return;

    if (payment_type !== 'subscription' && !artist_profile_id) {
      toast.error('Artist information missing');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        payment_type,
      };

      if (payment_type === 'merch') {
        payload.items = items;
        payload.artist_profile_id = artist_profile_id;
        payload.artist_name = artist_name;
      } else if (payment_type === 'tickets') {
        payload.artist_profile_id = artist_profile_id;
        payload.artist_name = artist_name;
        payload.event_id = event_id;
        payload.event_title = event_title;
        payload.amount = amount;
        payload.quantity = quantity || 1;
      } else if (payment_type === 'donation') {
        payload.artist_profile_id = artist_profile_id;
        payload.artist_name = artist_name;
        payload.amount = amount;
      } else if (payment_type === 'support') {
        payload.artist_profile_id = artist_profile_id;
        payload.artist_name = artist_name;
        payload.amount = amount;
        payload.is_recurring = is_recurring;
      } else if (payment_type === 'subscription') {
        payload.plan_code = plan_code;
        payload.billing_cycle = billing_cycle;
        payload.amount = amount;
        payload.name = name;
        if (artist_profile_id) {
          payload.artist_profile_id = artist_profile_id;
          payload.artist_name = artist_name;
        }
      }

      const response = await base44.functions.invoke('createCheckout', payload);
      const { checkout_url, order_number } = response.data;

      if (onSuccess) onSuccess({ order_number });

      // Redirect to Wix Payments checkout (Stripe, PayPal, Cash App, Chime, Apple Pay, Google Pay all available)
      window.location.href = checkout_url;
    } catch (error) {
      console.error('Checkout error:', error);
      const message = error?.error || error?.response?.data?.error || error?.message || 'Failed to start checkout. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleCheckout}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      {children}
    </Button>
  );
}