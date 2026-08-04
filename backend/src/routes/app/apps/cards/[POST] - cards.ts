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

router.post('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autenticado' });

  const body = asObject(req.body);
  const name = body ? parseName(body.name) : undefined;
  const limit =
    body && hasOwn(body, 'limit') ? parseNullableMoney(body.limit) : null;
  const closingDay =
    body && hasOwn(body, 'closingDay')
      ? parseNullableDay(body.closingDay)
      : null;
  const dueDay =
    body && hasOwn(body, 'dueDay') ? parseNullableDay(body.dueDay) : null;

  if (!body || !name || (hasOwn(body, 'limit') && limit === undefined)) {
    return res
      .status(400)
      .json({ error: 'Informe um nome e um limite válido' });
  }
  if (
    (hasOwn(body, 'closingDay') && closingDay === undefined) ||
    (hasOwn(body, 'dueDay') && dueDay === undefined)
  ) {
    return res.status(400).json({ error: 'Os dias devem estar entre 1 e 31' });
  }

  try {
    const card = await prisma.card.create({
      data: { userId, name, limit, closingDay, dueDay },
    });
    return res.status(201).json(serializeCard(card));
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
