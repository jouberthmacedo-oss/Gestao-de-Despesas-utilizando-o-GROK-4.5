import { Router } from 'express';

import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../middlewares/require-auth';
import {
  asObject,
  hasOwn,
  isEntryFrequency,
  isEntryType,
  parseMoney,
  parseName,
  parseNullableDateOnly,
  serializeEntry,
} from '../validation';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autenticado' });

  const body = asObject(req.body);
  const name = body ? parseName(body.name) : undefined;
  const amount = body ? parseMoney(body.amount) : undefined;
  const type = body && isEntryType(body.type) ? body.type : undefined;
  const frequency =
    body && isEntryFrequency(body.frequency) ? body.frequency : undefined;
  const parsedDate =
    body && hasOwn(body, 'date') ? parseNullableDateOnly(body.date) : null;

  if (
    !body ||
    !name ||
    !amount ||
    !type ||
    !frequency ||
    (hasOwn(body, 'date') && parsedDate === undefined) ||
    (frequency === 'unica' && !(parsedDate instanceof Date)) ||
    (frequency === 'mensal' && parsedDate instanceof Date)
  ) {
    return res.status(400).json({ error: 'Dados da entrada inválidos' });
  }

  const date = frequency === 'unica' ? parsedDate : null;
  if (frequency === 'unica' && !(date instanceof Date)) {
    return res.status(400).json({ error: 'Informe uma data válida' });
  }

  try {
    const entry = await prisma.entry.create({
      data: { userId, name, amount, type, frequency, date },
    });
    return res.status(201).json(serializeEntry(entry));
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
