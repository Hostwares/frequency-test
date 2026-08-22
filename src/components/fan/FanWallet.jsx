import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingCart, CreditCard, Package, Download, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

export default function FanWallet({ userId }) {
  const [cart, setCart] = useState([]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['fan-orders', userId],
    queryFn: () => base44.entities.Order.filter({ fan_user_id: userId }),
    enabled: !!userId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }),
  });

  const checkoutMutation = useMutation({
    mutationFn: async (checkoutData) => {
      const response = await base44.functions.invoke('createCheckout', checkoutData);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error('Failed to create checkout session');
      }
    },
  });

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_title: product.title,
        price: product.price,
        shipping_cost: product.shipping_cost,
        quantity,
        variant: null,
      }];
    });
    toast.success('Added to cart');
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    // Group by artist
    const byArtist = {};
    cart.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        if (!byArtist[product.artist_profile_id]) {
          byArtist[product.artist_profile_id] = {
            artist_profile_id: product.artist_profile_id,
            artist_name: product.artist_name,
            items: [],
          };
        }
        byArtist[product.artist_profile_id].items.push(item);
      }
    });

    // Create separate checkout for each artist
    Object.values(byArtist).forEach(({ artist_profile_id, artist_name, items }) => {
      checkoutMutation.mutate({
        items,
        artist_profile_id,
        artist_name,
      });
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20">
            <CreditCard className="w-5 h-5 text-neon-magenta" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">My Purchases</h2>
            <p className="text-xs text-muted-foreground">Order history and digital downloads</p>
          </div>
        </div>
        {cart.length > 0 && (
          <NeonBadge color="magenta">
            <ShoppingCart className="w-3 h-3 mr-1" />
            {cart.length} items • ${cartTotal.toFixed(2)}
          </NeonBadge>
        )}
      </div>

      {/* Orders List */}
      {ordersLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-xl">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No purchases yet</p>
          <p className="text-xs text-muted-foreground mt-1">Support artists by buying their merch and music</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="p-4 rounded-xl bg-secondary/10 border border-border/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{order.order_number}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_date).toLocaleDateString()} • {order.artist_name}
                  </p>
                </div>
                <NeonBadge color={order.payment_status === 'paid' ? 'cyan' : 'magenta'}>
                  {order.payment_status === 'paid' ? 'Paid' : order.payment_status}
                </NeonBadge>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.product_title}
                    </span>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Total & Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                <div className="flex items-center gap-2 text-xs">
                  {order.fulfillment_status === 'digital_delivered' ? (
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  ) : order.fulfillment_status === 'shipped' ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Truck className="w-3 h-3" />
                      Shipped
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Processing</span>
                  )}
                </div>
                <span className="font-bold text-neon-cyan">${order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-card border border-border/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Cart Total</span>
            <span className="text-lg font-bold text-neon-magenta">${cartTotal.toFixed(2)}</span>
          </div>
          <Button className="w-full" onClick={handleCheckout} disabled={checkoutMutation.isPending}>
            {checkoutMutation.isPending ? 'Processing...' : 'Checkout with Base44 Payments'}
          </Button>
        </div>
      )}
    </GlassCard>
  );
}