import { Router } from 'express';

import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../middlewares/require-auth';

const router = Router();

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autenticado' });

  try {
    const id = String(req.params.id);
    const existing = await prisma.card.findFirst({ where: { id, userId } });
    if (!existing)
      return res.status(404).json({ error: 'Cartão não encontrado' });

    await prisma.card.delete({ where: { id: existing.id } });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
