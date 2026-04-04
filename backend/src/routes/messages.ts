import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, messages } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { notifyAdminNewMessage } from '../lib/mailer.js';

const sendMessageSchema = z.object({
  sender_name: z.string().min(2).max(100),
  sender_email: z.string().email(),
  subject: z.string().max(100).default(''),
  content: z.string().min(1).max(5000),
  status: z.literal('unread').default('unread'),
});

const updateStatusSchema = z.object({
  status: z.enum(['unread', 'read', 'archived']),
});

export const messageRoutes = new Hono()

  // POST /api/messages  (public)
  .post('/', zValidator('json', sendMessageSchema), async (c) => {
    const data = c.req.valid('json');
    await db.insert(messages).values(data);

    notifyAdminNewMessage({
      senderName: data.sender_name,
      senderEmail: data.sender_email,
      subject: data.subject,
      content: data.content,
    }).catch((err) => console.error('[mail] message:', err));

    return c.json({ success: true, message: 'Votre message a été envoyé avec succès !' }, 201);
  })

  // GET /api/messages  (admin)
  .get('/', requireAdmin, async (c) => {
    const rows = await db.select().from(messages).orderBy(desc(messages.created_at));
    return c.json(rows);
  })

  // PATCH /api/messages/:id/status  (admin)
  .patch('/:id/status', requireAdmin, zValidator('json', updateStatusSchema), async (c) => {
    const { id } = c.req.param();
    const { status } = c.req.valid('json');
    const [row] = await db
      .update(messages)
      .set({ status })
      .where(eq(messages.id, id))
      .returning();
    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json(row);
  })

  // DELETE /api/messages/:id  (admin)
  .delete('/:id', requireAdmin, async (c) => {
    const { id } = c.req.param();
    await db.delete(messages).where(eq(messages.id, id));
    return c.json({ ok: true });
  });
