import { Router } from 'express';
import { db, weeklyAdsTable, weeklyAdItemsTable } from '@workspace/db';
import { requireAuth } from '../middlewares/requireAuth.js';
import { serialize } from '../lib/serialize.js';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

const router: Router = Router();

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const { adText, sourceUrl, storeName, weekOf, imageBase64 } = req.body as {
    adText?: string;
    sourceUrl?: string;
    storeName?: string;
    weekOf?: string;
    imageBase64?: string;
  };

  try {
    const openai = getOpenAI();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = imageBase64
      ? [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: 'Extract sale items from this weekly grocery ad. Return JSON: { storeName, weekOf, items: [{ name, salePrice, regularPrice, unit, category, notes }] }' },
          ],
        }]
      : [{
          role: 'user',
          content: `Extract sale items from this weekly ad text. Return JSON: { storeName, weekOf, items: [{ name, salePrice, regularPrice, unit, category, notes }] }\n\n${adText ?? ''}`,
        }];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.1,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      storeName?: string;
      weekOf?: string;
      items?: Array<{ name: string; salePrice?: string; regularPrice?: string; unit?: string; category?: string; notes?: string }>;
    };

    const adId = crypto.randomUUID();
    const [ad] = await db.insert(weeklyAdsTable).values({
      id: adId,
      userId: req.userId,
      storeName: storeName ?? parsed.storeName ?? 'Unknown',
      weekOf: weekOf ?? parsed.weekOf,
      sourceUrl,
      rawText: adText,
      status: 'parsed',
    }).returning();

    const insertedItems = [];
    for (const item of parsed.items ?? []) {
      const [row] = await db.insert(weeklyAdItemsTable).values({
        id: crypto.randomUUID(),
        weeklyAdId: adId,
        userId: req.userId,
        name: item.name,
        salePrice: item.salePrice,
        regularPrice: item.regularPrice,
        unit: item.unit,
        category: item.category,
        notes: item.notes,
      }).returning();
      insertedItems.push(row);
    }

    res.json(serialize({ ...ad, items: insertedItems }));
  } catch (err) {
    logger.error({ err }, 'Weekly ad parse error');
    res.status(500).json({ error: 'Parse failed' });
  }
  return;
});

export default router;
