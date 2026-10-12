const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/* GET /produtos — listar todos (aceita ?busca= e ?categoria=) */
router.get('/', (req, res) => {
  const db = getDb();
  const { busca, categoria } = req.query;

  let sql = 'SELECT * FROM PRODUTO WHERE 1=1';
  const params = [];

  if (busca) {
    sql += ' AND (nome LIKE ? OR categoria LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`);
  }
  if (categoria) {
    sql += ' AND categoria = ?';
    params.push(categoria);
  }

  sql += ' ORDER BY categoria, nome';

  try {
    const produtos = db.prepare(sql).all(...params);
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* GET /produtos/:id — buscar um produto */
router.get('/:id', (req, res) => {
  const db = getDb();
  try {
    const produto = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(produto);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* POST /produtos — cadastrar novo produto */
router.post('/', (req, res) => {
  const db = getDb();
  const { nome, categoria, quantidade_atual, quantidade_minima, preco, custo } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome do produto é obrigatório.' });
  }
  if (preco == null || isNaN(preco) || preco < 0) {
    return res.status(400).json({ erro: 'Preço inválido.' });
  }

  /* verificar duplicata */
  const existe = db.prepare('SELECT id_produto FROM PRODUTO WHERE LOWER(nome) = LOWER(?)').get(nome.trim());
  if (existe) {
    return res.status(409).json({ erro: 'Já existe um produto com esse nome.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO PRODUTO (nome, categoria, quantidade_atual, quantidade_minima, preco, custo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      nome.trim(),
      (categoria || 'Geral').trim(),
      parseInt(quantidade_atual, 10) || 0,
      parseInt(quantidade_minima, 10) || 0,
      parseFloat(preco) || 0,
      parseFloat(custo) || 0
    );
    const novo = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(info.lastInsertRowid);
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* PUT /produtos/:id — atualizar produto */
router.put('/:id', (req, res) => {
  const db = getDb();
  const { nome, categoria, quantidade_atual, quantidade_minima, preco, custo } = req.body;
  const id = req.params.id;

  const atual = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(id);
  if (!atual) return res.status(404).json({ erro: 'Produto não encontrado.' });

  try {
    db.prepare(`
      UPDATE PRODUTO SET nome = ?, categoria = ?, quantidade_atual = ?,
        quantidade_minima = ?, preco = ?, custo = ?
      WHERE id_produto = ?
    `).run(
      (nome || atual.nome).trim(),
      (categoria || atual.categoria).trim(),
      quantidade_atual != null ? parseInt(quantidade_atual, 10) : atual.quantidade_atual,
      quantidade_minima != null ? parseInt(quantidade_minima, 10) : atual.quantidade_minima,
      preco != null ? parseFloat(preco) : atual.preco,
      custo != null ? parseFloat(custo) : atual.custo,
      id
    );
    const atualizado = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(id);
    res.json(atualizado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* DELETE /produtos/:id — excluir produto */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const id = req.params.id;

  const produto = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

  try {
    db.prepare('DELETE FROM PRODUTO WHERE id_produto = ?').run(id);
    res.json({ mensagem: `Produto "${produto.nome}" excluído.` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
