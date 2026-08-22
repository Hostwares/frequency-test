import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Returns whether the current user has a paid order containing the given song.
// Used to gate Song Store reviews to actual purchasers.
export function useSongPurchase(songId) {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const ordersQuery = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () =>
      base44.entities.Order.filter({ fan_user_id: user?.id }, '-created_date', 200),
    enabled: !!user?.id,
  });

  const orders = ordersQuery.data || [];
  const hasPurchased = orders.some(
    (o) =>
      o.payment_status === 'paid' &&
      Array.isArray(o.items) &&
      o.items.some((it) => it.product_id === songId)
  );

  return { hasPurchased, loading: userLoading || ordersQuery.isLoading };
}