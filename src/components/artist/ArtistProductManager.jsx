import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Package, Edit, Trash2, Upload, DollarSign, Tag, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import GlassCard from '@/components/shared/GlassCard';
import NeonBadge from '@/components/shared/NeonBadge';

export default function ArtistProductManager({ artistProfileId, artistName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['artist-products', artistProfileId],
    queryFn: () => base44.entities.Product.filter({ artist_profile_id: artistProfileId }),
    enabled: !!artistProfileId,
  });

  const createProductMutation = useMutation({
    mutationFn: (productData) => base44.entities.Product.create(productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-products'] });
      setIsOpen(false);
      setEditingProduct(null);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-products'] });
      setIsOpen(false);
      setEditingProduct(null);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId) => base44.entities.Product.delete(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-products'] });
    },
  });

  const handleSave = (productData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleDelete = (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(productId);
    }
  };

  const totalRevenue = products.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
  const totalSales = products.reduce((sum, p) => sum + (p.total_sales || 0), 0);

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/20">
            <Package className="w-5 h-5 text-neon-purple" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Products & Merchandise</h2>
            <p className="text-xs text-muted-foreground">Manage your inventory and sales</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProduct(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSave={handleSave}
              onCancel={() => {
                setIsOpen(false);
                setEditingProduct(null);
              }}
              isLoading={createProductMutation.isPending || updateProductMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
          <Package className="w-5 h-5 text-neon-purple mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-purple">{products.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Products</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
          <DollarSign className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-cyan">${totalRevenue.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Total Revenue</p>
        </div>
        <div className="bg-secondary/20 rounded-xl p-4 text-center border border-border/30">
          <Tag className="w-5 h-5 text-neon-magenta mx-auto mb-2" />
          <p className="text-2xl font-bold text-neon-magenta">{totalSales}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Total Sales</p>
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-xl">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No products yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Start selling merch, music, and more.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-secondary/10 border border-border/30 hover:bg-secondary/20 transition-colors"
            >
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-16 h-16 rounded-lg object-cover border border-border/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-secondary/30 border border-border/30 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{product.title}</h3>
                  {product.product_type === 'digital' && (
                    <NeonBadge color="cyan">Digital</NeonBadge>
                  )}
                  {product.is_unlimited && (
                    <NeonBadge color="purple">Unlimited</NeonBadge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>${product.price}</span>
                  <span>•</span>
                  <span>{product.inventory_count} in stock</span>
                  <span>•</span>
                  <span>{product.total_sales || 0} sales</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingProduct(product);
                    setIsOpen(true);
                  }}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(product.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function ProductForm({ product, onSave, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    title: product?.title || '',
    description: product?.description || '',
    category: product?.category || 'merch',
    product_type: product?.product_type || 'physical',
    price: product?.price || 0,
    compare_at_price: product?.compare_at_price || null,
    inventory_count: product?.inventory_count || 0,
    is_unlimited: product?.is_unlimited || false,
    shipping_cost: product?.shipping_cost || 0,
    images: product?.images || [],
    digital_file_url: product?.digital_file_url || '',
    tags: product?.tags || [],
    is_available: product?.is_available ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Product Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Limited Edition Vinyl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merch">Merchandise</SelectItem>
              <SelectItem value="vinyl">Vinyl</SelectItem>
              <SelectItem value="cd">CD</SelectItem>
              <SelectItem value="poster">Poster</SelectItem>
              <SelectItem value="digital_download">Digital Download</SelectItem>
              <SelectItem value="experience">Experience</SelectItem>
              <SelectItem value="lesson">Lesson</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your product..."
          className="h-24"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="compare_at_price">Compare at Price</Label>
          <Input
            id="compare_at_price"
            type="number"
            step="0.01"
            value={formData.compare_at_price || ''}
            onChange={(e) => setFormData({ ...formData, compare_at_price: parseFloat(e.target.value) || null })}
            placeholder="Original price"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_type">Product Type</Label>
          <Select
            value={formData.product_type}
            onValueChange={(value) => setFormData({ ...formData, product_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="digital">Digital</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.product_type === 'physical' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="inventory">Inventory Count</Label>
            <Input
              id="inventory"
              type="number"
              value={formData.inventory_count}
              onChange={(e) => setFormData({ ...formData, inventory_count: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipping">Shipping Cost ($)</Label>
            <Input
              id="shipping"
              type="number"
              step="0.01"
              value={formData.shipping_cost}
              onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

      {formData.product_type === 'digital' && (
        <div className="space-y-2">
          <Label htmlFor="digital_file">Digital File URL</Label>
          <Input
            id="digital_file"
            value={formData.digital_file_url}
            onChange={(e) => setFormData({ ...formData, digital_file_url: e.target.value })}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">
            Upload your file and paste the URL here
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}