import { Router } from 'express';
import { db, receiptsTable, receiptItemsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
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
  const { receiptText, receiptId, imageBase64 } = req.body as {
    receiptText?: string;
    receiptId?: string;
    imageBase64?: string;
  };

  if (!receiptText && !imageBase64) {
    res.status(400).json({ error: 'receiptText or imageBase64 required' });
    return;
  }

  try {
    const openai = getOpenAI();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = imageBase64
      ? [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: 'Extract all grocery items from this receipt. Return JSON: { storeName, purchaseDate, total, items: [{ name, quantity, unit, price, category }] }. Categories: Produce, Dairy, Proteins, Grains, Canned, Frozen, Beverages, Snacks, Household, Other.' },
          ],
        }]
      : [{
          role: 'user',
          content: `Extract grocery items from this receipt text. Return JSON: { storeName, purchaseDate, total, items: [{ name, quantity, unit, price, category }] }. Categories: Produce, Dairy, Proteins, Grains, Canned, Frozen, Beverages, Snacks, Household, Other.\n\n${receiptText}`,
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
      purchaseDate?: string;
      total?: string;
      items?: Array<{ name: string; quantity?: string; unit?: string; price?: string; category?: string }>;
    };

    let targetReceiptId = receiptId;
    if (targetReceiptId) {
      await db.update(receiptsTable).set({
        storeName: parsed.storeName,
        purchaseDate: parsed.purchaseDate,
        total: parsed.total,
        rawText: receiptText,
        status: 'parsed',
        itemCount: parsed.items?.length ?? 0,
        updatedAt: new Date(),
      }).where(eq(receiptsTable.id, targetReceiptId));
    } else {
      const [receipt] = await db.insert(receiptsTable).values({
        id: crypto.randomUUID(),
        userId: req.userId,
        storeName: parsed.storeName,
        purchaseDate: parsed.purchaseDate,
        total: parsed.total,
        rawText: receiptText,
        status: 'parsed',
        itemCount: parsed.items?.length ?? 0,
      }).returning();
      targetReceiptId = receipt.id;
    }

    const insertedItems = [];
    for (const item of parsed.items ?? []) {
      const [row] = await db.insert(receiptItemsTable).values({
        id: crypto.randomUUID(),
        receiptId: targetReceiptId!,
        userId: req.userId,
        name: item.name,
        quantity: item.quantity ?? '1',
        unit: item.unit ?? 'count',
        price: item.price,
        category: item.category ?? 'Other',
      }).returning();
      insertedItems.push(row);
    }

    res.json(serialize({ receiptId: targetReceiptId, ...parsed, items: insertedItems }));
  } catch (err) {
    logger.error({ err }, 'Receipt parse error');
    res.status(500).json({ error: 'Parse failed' });
  }
  return;
});

export default router;
