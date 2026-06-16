import { logger } from './logger.js';

interface BarcodeProduct {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (upcRes.ok) {
      const data = await upcRes.json() as { items?: Array<{ title: string; brand: string; category: string; images: string[] }> };
      const item = data.items?.[0];
      if (item) {
        return {
          name: item.title,
          brand: item.brand,
          category: item.category,
          imageUrl: item.images?.[0],
        };
      }
    }
  } catch (err) {
    logger.warn({ err, barcode }, 'UPC Item DB lookup failed');
  }

  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (offRes.ok) {
      const data = await offRes.json() as { status: number; product?: { product_name: string; brands: string; categories_tags: string[]; image_url: string } };
      if (data.status === 1 && data.product) {
        return {
          name: data.product.product_name,
          brand: data.product.brands,
          category: data.product.categories_tags?.[0]?.replace('en:', ''),
          imageUrl: data.product.image_url,
        };
      }
    }
  } catch (err) {
    logger.warn({ err, barcode }, 'Open Food Facts lookup failed');
  }

  return null;
}
