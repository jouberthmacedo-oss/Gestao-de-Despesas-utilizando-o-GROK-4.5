import { Router } from 'express';

import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../middlewares/require-auth';
import { serializeEntry } from '../validation';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autenticado' });

  try {
    const entries = await prisma.entry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(entries.map(serializeEntry));
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
