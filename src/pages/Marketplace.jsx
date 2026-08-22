import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShoppingBag, Filter, Search, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';
import { toast } from 'sonner';

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cart, setCart] = useState([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['marketplace-products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }),
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.artist_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesType = typeFilter === 'all' || product.product_type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_title: product.title,
        artist_name: product.artist_name,
        price: product.price,
        shipping_cost: product.shipping_cost,
        quantity: 1,
      }];
    });
    toast.success('Added to cart');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20">
              <ShoppingBag className="w-6 h-6 text-neon-magenta" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Artist Marketplace</h1>
              <p className="text-xs text-muted-foreground">Direct support through merch, music, and more</p>
            </div>
          </div>
          {cart.length > 0 && (
            <NeonBadge color="magenta">
              <ShoppingCart className="w-4 h-4 mr-1" />
              {cart.length} items • ${cartTotal.toFixed(2)}
            </NeonBadge>
          )}
        </div>

        {/* Filters */}
        <GlassCard hover={false} className="p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products or artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="merch">Merchandise</SelectItem>
                  <SelectItem value="vinyl">Vinyl</SelectItem>
                  <SelectItem value="cd">CD</SelectItem>
                  <SelectItem value="poster">Poster</SelectItem>
                  <SelectItem value="digital_download">Digital</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCard>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-secondary/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <GlassCard hover={false} className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No products found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard hover={true} className="overflow-hidden">
                  {/* Product Image */}
                  <div className="aspect-square bg-secondary/30 relative">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
                      </div>
                    )}
                    {product.product_type === 'digital' && (
                      <NeonBadge color="cyan" className="absolute top-2 right-2">
                        Digital
                      </NeonBadge>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm truncate">{product.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{product.artist_name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {product.compare_at_price && (
                        <span className="text-xs text-muted-foreground line-through">
                          ${product.compare_at_price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-lg font-bold text-neon-cyan">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>

                    {product.product_type === 'physical' && (
                      <p className="text-xs text-muted-foreground">
                        {product.is_unlimited ? '∞ in stock' : `${product.inventory_count} in stock`}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => addToCart(product)}
                      disabled={product.product_type === 'physical' && !product.is_unlimited && product.inventory_count === 0}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}