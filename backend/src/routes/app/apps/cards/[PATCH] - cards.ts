import { Router } from 'express';

import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../middlewares/require-auth';
import {
  asObject,
  hasOwn,
  parseName,
  parseNullableDay,
  parseNullableMoney,
  serializeCard,
} from '../validation';

const router = Router();

router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autenticado' });

  const body = asObject(req.body);
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Informe ao menos um campo' });
  }

  try {
    const id = String(req.params.id);
    const existing = await prisma.card.findFirst({ where: { id, userId } });
    if (!existing)
      return res.status(404).json({ error: 'Cartão não encontrado' });

    const data: {
      name?: string;
      limit?: string | null;
      closingDay?: number | null;
      dueDay?: number | null;
    } = {};

    if (hasOwn(body, 'name')) {
      const name = parseName(body.name);
      if (!name)
        return res.status(400).json({ error: 'Informe um nome válido' });
      data.name = name;
    }
    if (hasOwn(body, 'limit')) {
      const limit = parseNullableMoney(body.limit);
      if (limit === undefined)
        return res.status(400).json({ error: 'Informe um limite válido' });
      data.limit = limit;
    }
    if (hasOwn(body, 'closingDay')) {
      const closingDay = parseNullableDay(body.closingDay);
      if (closingDay === undefined)
        return res
          .status(400)
          .json({ error: 'O dia de fechamento deve estar entre 1 e 31' });
      data.closingDay = closingDay;
    }
    if (hasOwn(body, 'dueDay')) {
      const dueDay = parseNullableDay(body.dueDay);
      if (dueDay === undefined)
        return res
          .status(400)
          .json({ error: 'O dia de vencimento deve estar entre 1 e 31' });
      data.dueDay = dueDay;
    }

    const card = await prisma.card.update({ where: { id: existing.id }, data });
    return res.json(serializeCard(card));
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
