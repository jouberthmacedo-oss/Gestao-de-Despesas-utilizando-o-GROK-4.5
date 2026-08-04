import { Router } from 'express';

import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../middlewares/require-auth';
import {
  asObject,
  EXPENSE_CATEGORIES,
  hasOwn,
  isExpenseCategory,
  parseMoney,
  parseName,
  parseNullableCardId,
  parseNullableDay,
  parseNullableNotes,
  serializeExpense,
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
    const existing = await prisma.expense.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    const data: {
      name?: string;
      amount?: string;
      category?: (typeof EXPENSE_CATEGORIES)[number];
      frequency?: 'mensal';
      cardId?: string | null;
      dueDay?: number | null;
      notes?: string | null;
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
    if (hasOwn(body, 'category')) {
      if (!isExpenseCategory(body.category)) {
        return res.status(400).json({ error: 'Categoria inválida' });
      }
      data.category = body.category;
    }
    if (hasOwn(body, 'frequency')) {
      if (body.frequency !== 'mensal') {
        return res.status(400).json({ error: 'Frequência inválida' });
      }
      data.frequency = 'mensal';
    }
    if (hasOwn(body, 'cardId')) {
      const cardId = parseNullableCardId(body.cardId);
      if (cardId === undefined)
        return res.status(400).json({ error: 'Cartão inválido' });
      if (cardId) {
        const card = await prisma.card.findFirst({
          where: { id: cardId, userId },
        });
        if (!card) return res.status(400).json({ error: 'Cartão inválido' });
      }
      data.cardId = cardId;
    }
    if (hasOwn(body, 'dueDay')) {
      const dueDay = parseNullableDay(body.dueDay);
      if (dueDay === undefined)
        return res.status(400).json({ error: 'O dia deve estar entre 1 e 31' });
      data.dueDay = dueDay;
    }
    if (hasOwn(body, 'notes')) {
      const notes = parseNullableNotes(body.notes);
      if (notes === undefined)
        return res.status(400).json({ error: 'Observações inválidas' });
      data.notes = notes;
    }

    const expense = await prisma.expense.update({
      where: { id: existing.id },
      data,
    });
    return res.json(serializeExpense(expense));
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
