import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const artistProfileId = body?.artist_profile_id;
    if (!artistProfileId) return Response.json({ error: 'artist_profile_id required' }, { status: 400 });

    // Verify the caller owns this artist profile (or is admin)
    const profiles = await base44.asServiceRole.entities.ArtistProfile.filter({ id: artistProfileId });
    const profile = profiles?.[0];
    if (!profile) return Response.json({ error: 'Artist not found' }, { status: 404 });
    const isOwner = profile.user_id === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'master_admin';
    if (!isOwner && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Build a lookup of the artist's songs (only these product_ids count as song sales)
    const songs = await base44.asServiceRole.entities.Song.filter(
      { artist_profile_id: artistProfileId },
      '-created_date',
      500
    );
    const songMeta = {};
    const songIds = new Set();
    for (const s of songs) {
      songIds.add(s.id);
      songMeta[s.id] = { title: s.title || 'Untitled', album: s.album || 'Single' };
    }

    // All orders for this artist (paid + pending/abandoned). Pending orders
    // represent initiated checkouts and power the conversion-rate metric.
    const orders = await base44.asServiceRole.entities.Order.filter(
      { artist_profile_id: artistProfileId },
      '-created_date',
      500
    );

    let totalSales = 0;
    let grossRevenue = 0;
    let netRevenue = 0;
    let totalOrders = 0;
    let totalSongCheckouts = 0;
    const bySong = {};
    const byAlbum = {};
    const byMonth = {};
    const byMonthSales = {};
    const byDay = {};
    const byCountry = {};
    const fans = {};
    const fanSet = new Set();

    for (const order of orders) {
      if (!order.items) continue;
      const isPaid = order.payment_status === 'paid';
      const orderCountry = isPaid
        ? (order.shipping_address?.country || 'Unknown')
        : 'Unknown';
      let orderHasSong = false;
      for (const item of order.items) {
        if (!item.product_id || !songIds.has(item.product_id)) continue;
        const qty = item.quantity || 1;
        const rev = (item.price || 0) * qty;
        orderHasSong = true;
        if (!isPaid) continue; // only paid orders contribute revenue
        totalSales += qty;
        grossRevenue += rev;
        const meta = songMeta[item.product_id] || { title: item.product_title || 'Untitled', album: 'Single' };
        if (!bySong[item.product_id]) {
          bySong[item.product_id] = { title: meta.title, album: meta.album, sales: 0, revenue: 0 };
        }
        bySong[item.product_id].sales += qty;
        bySong[item.product_id].revenue += rev;
        const albumKey = meta.album || 'Single';
        byAlbum[albumKey] = (byAlbum[albumKey] || 0) + rev;
        if (order.created_date) {
          const ds = String(order.created_date);
          const mk = ds.slice(0, 7);
          byMonth[mk] = (byMonth[mk] || 0) + rev;
          byMonthSales[mk] = (byMonthSales[mk] || 0) + qty;
          const dayKey = ds.slice(0, 10);
          if (!byDay[dayKey]) byDay[dayKey] = { revenue: 0, sales: 0 };
          byDay[dayKey].revenue += rev;
          byDay[dayKey].sales += qty;
        }
        byCountry[orderCountry] = (byCountry[orderCountry] || 0) + rev;
        if (order.fan_user_id) {
          fans[order.fan_user_id] = (fans[order.fan_user_id] || 0) + 1;
          fanSet.add(order.fan_user_id);
        }
      }
      if (orderHasSong) {
        totalSongCheckouts += 1;
        if (isPaid) {
          totalOrders += 1;
          // Direct song purchase orders are song-only, so the order's artist_earnings is the net.
          netRevenue += Number(order.artist_earnings || 0);
        }
      }
    }

    let repeatPurchasers = 0;
    for (const fid in fans) if (fans[fid] > 1) repeatPurchasers += 1;
    const avgPurchaseValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;

    const revenueByCountry = Object.entries(byCountry)
      .map(([country, revenue]) => ({ country, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    const conversionRate = totalSongCheckouts > 0
      ? Number(((totalOrders / totalSongCheckouts) * 100).toFixed(1))
      : 0;

    const topSongs = Object.entries(bySong)
      .map(([id, v]) => ({ id, title: v.title, album: v.album, sales: v.sales, revenue: v.revenue }))
      .sort((a, b) => b.sales - a.sales || b.revenue - a.revenue)
      .slice(0, 5);

    const revenueBySong = Object.entries(bySong)
      .map(([id, v]) => ({ id, title: v.title, sales: v.sales, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
    const revenueByAlbum = Object.entries(byAlbum)
      .map(([album, revenue]) => ({ album, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue);
    const revenueByMonth = Object.entries(byMonth)
      .map(([month, revenue]) => ({ month, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => a.month.localeCompare(b.month));
    const salesByMonth = Object.entries(byMonthSales)
      .map(([month, sales]) => ({ month, sales }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Last 30 days of revenue (zero-filled) for the daily chart
    const revenueByDay = [];
    const todayDate = new Date();
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(todayDate);
      dt.setUTCDate(dt.getUTCDate() - i);
      const key = dt.toISOString().slice(0, 10);
      const dayData = byDay[key] || { revenue: 0, sales: 0 };
      revenueByDay.push({ date: key, revenue: Number(dayData.revenue.toFixed(2)), sales: dayData.sales });
    }

    return Response.json({
      totalSales,
      grossRevenue: Number(grossRevenue.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
      totalOrders,
      uniqueFans: fanSet.size,
      repeatPurchasers,
      avgPurchaseValue: Number(avgPurchaseValue.toFixed(2)),
      conversionRate,
      totalCheckouts: totalSongCheckouts,
      paidCheckouts: totalOrders,
      revenueByCountry,
      topSongs,
      revenueBySong,
      revenueByAlbum,
      revenueByMonth,
      salesByMonth,
      revenueByDay,
    });
  } catch (error) {
    console.error('getSongStoreAnalytics error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}