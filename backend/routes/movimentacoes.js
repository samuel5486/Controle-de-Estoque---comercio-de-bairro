const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/* POST /movimentacoes — registrar entrada ou saída manual */
router.post('/', (req, res) => {
  const db = getDb();
  const { tipo, quantidade, id_produto, id_usuario } = req.body;

  if (!tipo || !['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo deve ser "entrada" ou "saida".' });
  }
  if (!quantidade || quantidade <= 0) {
    return res.status(400).json({ erro: 'Quantidade deve ser maior que zero.' });
  }
  if (!id_produto) {
    return res.status(400).json({ erro: 'id_produto é obrigatório.' });
  }

  const produto = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(id_produto);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

  if (tipo === 'saida' && produto.quantidade_atual < quantidade) {
    return res.status(400).json({ erro: `Estoque insuficiente. Disponível: ${produto.quantidade_atual}.` });
  }

  const data = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const registrar = db.transaction(() => {
      /* atualizar estoque */
      const delta = tipo === 'entrada' ? quantidade : -quantidade;
      db.prepare('UPDATE PRODUTO SET quantidade_atual = quantidade_atual + ? WHERE id_produto = ?')
        .run(delta, id_produto);

      /* registrar movimentação */
      const info = db.prepare(`
        INSERT INTO MOVIMENTACAO (tipo, data, quantidade, id_produto, id_usuario)
        VALUES (?, ?, ?, ?, ?)
      `).run(tipo, data, quantidade, id_produto, id_usuario || 1);

      return info.lastInsertRowid;
    });

    const movId = registrar();
    const mov = db.prepare('SELECT * FROM MOVIMENTACAO WHERE id_movimentacao = ?').get(movId);
    const produtoAtualizado = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(id_produto);

    res.status(201).json({
      movimentacao: mov,
      produto: produtoAtualizado,
      alerta_estoque: produtoAtualizado.quantidade_atual <= produtoAtualizado.quantidade_minima
        ? `"${produtoAtualizado.nome}" atingiu o estoque mínimo (${produtoAtualizado.quantidade_atual}/${produtoAtualizado.quantidade_minima}).`
        : null
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* GET /movimentacoes — listar (aceita ?de= e ?ate=) */
router.get('/', (req, res) => {
  const db = getDb();
  const { de, ate } = req.query;

  let sql = `
    SELECT m.*, p.nome AS produto_nome, u.nome AS usuario_nome
    FROM MOVIMENTACAO m
    JOIN PRODUTO p ON p.id_produto = m.id_produto
    JOIN USUARIO u ON u.id_usuario = m.id_usuario
    WHERE 1=1
  `;
  const params = [];

  if (de) { sql += ' AND m.data >= ?'; params.push(de); }
  if (ate) { sql += ' AND m.data <= ?'; params.push(ate); }

  sql += ' ORDER BY m.id_movimentacao DESC';

  try {
    const movs = db.prepare(sql).all(...params);
    res.json(movs);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
