import { Router } from 'express';

import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../middlewares/require-auth';
import {
  asObject,
  ENTRY_FREQUENCIES,
  ENTRY_TYPES,
  hasOnlyAllowedFields,
  hasOwn,
  isEntryFrequency,
  isEntryType,
  parseMoney,
  parseName,
  parseNullableDateOnly,
  serializeEntry,
} from '../validation';

const router = Router();
const ENTRY_PATCH_FIELDS = [
  'name',
  'amount',
  'type',
  'frequency',
  'date',
] as const;

router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autenticado' });

  const body = asObject(req.body);
  if (
    !body ||
    Object.keys(body).length === 0 ||
    !hasOnlyAllowedFields(body, ENTRY_PATCH_FIELDS)
  ) {
    return res.status(400).json({ error: 'Informe ao menos um campo' });
  }

  try {
    const id = String(req.params.id);
    const existing = await prisma.entry.findFirst({ where: { id, userId } });
    if (!existing)
      return res.status(404).json({ error: 'Entrada não encontrada' });

    const data: {
      name?: string;
      amount?: string;
      type?: (typeof ENTRY_TYPES)[number];
      frequency?: (typeof ENTRY_FREQUENCIES)[number];
      date?: Date | null;
    } = {};

    if (hasOwn(body, 'name')) {
      const name = parseName(body.name);
      if (!name)
        return res.status(400).json({ error: 'Informe um nome válido' });
      data.name = name;
    }
    if (hasOwn(body, 'amount')) {
      const amount = parseMoney(body.amount);
      if (!amount)
        return res.status(400).json({ error: 'Informe um valor válido' });
      data.amount = amount;
    }
    if (hasOwn(body, 'type')) {
      if (!isEntryType(body.type))
        return res.status(400).json({ error: 'Tipo inválido' });
      data.type = body.type;
    }

    const nextFrequency = hasOwn(body, 'frequency')
      ? body.frequency
      : existing.frequency;
    if (!isEntryFrequency(nextFrequency)) {
      return res.status(400).json({ error: 'Frequência inválida' });
    }
    if (hasOwn(body, 'frequency')) data.frequency = nextFrequency;

    let nextDate: Date | null = existing.date;
    if (hasOwn(body, 'date')) {
      const parsedDate = parseNullableDateOnly(body.date);
      if (parsedDate === undefined)
        return res.status(400).json({ error: 'Data inválida' });
      nextDate = parsedDate;
      data.date = parsedDate;
    }
    if (nextFrequency === 'unica' && !(nextDate instanceof Date)) {
      return res.status(400).json({ error: 'Informe uma data válida' });
    }
    if (nextFrequency === 'mensal') {
      if (hasOwn(body, 'date') && nextDate instanceof Date) {
        return res
          .status(400)
          .json({ error: 'Entradas mensais não aceitam data' });
      }
      if (existing.frequency !== 'mensal' && !hasOwn(body, 'date'))
        data.date = null;
    }

    const entry = await prisma.entry.update({
      where: { id: existing.id },
      data,
    });
    return res.json(serializeEntry(entry));
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
