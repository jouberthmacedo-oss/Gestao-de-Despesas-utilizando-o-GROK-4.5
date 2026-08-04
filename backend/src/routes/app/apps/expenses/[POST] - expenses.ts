import { Router } from 'express';

import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../middlewares/require-auth';
import {
  asObject,
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

router.post('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Não autenticado' });

  const body = asObject(req.body);
  const name = body ? parseName(body.name) : undefined;
  const amount = body ? parseMoney(body.amount) : undefined;
  const category =
    body && isExpenseCategory(body.category) ? body.category : undefined;
  const cardId =
    body && hasOwn(body, 'cardId') ? parseNullableCardId(body.cardId) : null;
  const dueDay =
    body && hasOwn(body, 'dueDay') ? parseNullableDay(body.dueDay) : null;
  const notes =
    body && hasOwn(body, 'notes') ? parseNullableNotes(body.notes) : null;
  const frequency = body?.frequency ?? 'mensal';

  if (
    !body ||
    !name ||
    !amount ||
    !category ||
    frequency !== 'mensal' ||
    (hasOwn(body, 'cardId') && cardId === undefined) ||
    (hasOwn(body, 'dueDay') && dueDay === undefined) ||
    (hasOwn(body, 'notes') && notes === undefined)
  ) {
    return res.status(400).json({ error: 'Dados da despesa inválidos' });
  }

  try {
    if (cardId) {
      const card = await prisma.card.findFirst({
        where: { id: cardId, userId },
      });
      if (!card) return res.status(400).json({ error: 'Cartão inválido' });
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        name,
        amount,
        category,
        frequency,
        cardId,
        dueDay,
        notes,
      },
    });
    return res.status(201).json(serializeExpense(expense));
  } catch {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
