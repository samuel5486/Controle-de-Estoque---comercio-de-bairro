const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

/* POST /vendas — registrar uma venda com itens e dar baixa no estoque */
router.post('/', (req, res) => {
  const db = getDb();
  const { itens, pagamento, id_usuario } = req.body;

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'A venda precisa ter pelo menos 1 item.' });
  }

  const data = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 5);

  try {
    const registrar = db.transaction(() => {
      /* calcular total e validar estoque */
      let total = 0;
      const itensCompletos = [];

      for (const item of itens) {
        const prod = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(item.id_produto);
        if (!prod) throw new Error(`Produto id ${item.id_produto} não encontrado.`);

        const qtd = parseInt(item.quantidade, 10) || 1;
        if (prod.quantidade_atual < qtd) {
          throw new Error(`Estoque insuficiente para "${prod.nome}". Disponível: ${prod.quantidade_atual}.`);
        }

        const preco = prod.preco;
        const custo = prod.custo || 0;
        total += preco * qtd;

        itensCompletos.push({ id_produto: prod.id_produto, qtd, preco, custo, nome: prod.nome });
      }

      /* número sequencial da venda */
      const ultimaVenda = db.prepare('SELECT MAX(numero) AS n FROM VENDA').get();
      const numero = (ultimaVenda.n || 0) + 1;

      /* inserir venda */
      const infoVenda = db.prepare(`
        INSERT INTO VENDA (numero, data, hora, total, pagamento, id_usuario)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(numero, data, hora, +total.toFixed(2), pagamento || 'dinheiro', id_usuario || 1);

      const id_venda = infoVenda.lastInsertRowid;

      /* inserir itens e dar baixa no estoque */
      const stmtItem = db.prepare(`
        INSERT INTO VENDA_ITEM (id_venda, id_produto, quantidade, preco, custo)
        VALUES (?, ?, ?, ?, ?)
      `);
      const stmtEstoque = db.prepare(`
        UPDATE PRODUTO SET quantidade_atual = quantidade_atual - ? WHERE id_produto = ?
      `);
      const stmtMov = db.prepare(`
        INSERT INTO MOVIMENTACAO (tipo, data, quantidade, id_produto, id_usuario)
        VALUES ('saida', ?, ?, ?, ?)
      `);

      const alertas = [];

      for (const it of itensCompletos) {
        stmtItem.run(id_venda, it.id_produto, it.qtd, it.preco, it.custo);
        stmtEstoque.run(it.qtd, it.id_produto);
        stmtMov.run(data, it.qtd, it.id_produto, id_usuario || 1);

        /* verificar estoque mínimo após baixa */
        const atualizado = db.prepare('SELECT * FROM PRODUTO WHERE id_produto = ?').get(it.id_produto);
        if (atualizado.quantidade_atual <= atualizado.quantidade_minima) {
          alertas.push(`"${atualizado.nome}" atingiu estoque mínimo (${atualizado.quantidade_atual}/${atualizado.quantidade_minima}).`);
        }
      }

      return { id_venda, numero, total: +total.toFixed(2), alertas };
    });

    const resultado = registrar();

    /* buscar venda completa para retornar */
    const venda = db.prepare('SELECT * FROM VENDA WHERE id_venda = ?').get(resultado.id_venda);
    const vendaItens = db.prepare(`
      SELECT vi.*, p.nome AS produto_nome, p.categoria
      FROM VENDA_ITEM vi
      JOIN PRODUTO p ON p.id_produto = vi.id_produto
      WHERE vi.id_venda = ?
    `).all(resultado.id_venda);

    res.status(201).json({
      venda: { ...venda, itens: vendaItens },
      alertas_estoque: resultado.alertas
    });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

/* GET /vendas — listar vendas (aceita ?de= e ?ate=) */
router.get('/', (req, res) => {
  const db = getDb();
  const { de, ate } = req.query;

  let sql = `
    SELECT v.*, u.nome AS usuario_nome
    FROM VENDA v
    JOIN USUARIO u ON u.id_usuario = v.id_usuario
    WHERE 1=1
  `;
  const params = [];

  if (de) { sql += ' AND v.data >= ?'; params.push(de); }
  if (ate) { sql += ' AND v.data <= ?'; params.push(ate); }

  sql += ' ORDER BY v.id_venda DESC';

  try {
    const vendas = db.prepare(sql).all(...params);

    /* carregar itens de cada venda */
    const stmtItens = db.prepare(`
      SELECT vi.*, p.nome AS produto_nome, p.categoria
      FROM VENDA_ITEM vi
      JOIN PRODUTO p ON p.id_produto = vi.id_produto
      WHERE vi.id_venda = ?
    `);

    const resultado = vendas.map(v => ({
      ...v,
      itens: stmtItens.all(v.id_venda)
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* GET /vendas/:id — detalhe de uma venda */
router.get('/:id', (req, res) => {
  const db = getDb();

  try {
    const venda = db.prepare(`
      SELECT v.*, u.nome AS usuario_nome
      FROM VENDA v
      JOIN USUARIO u ON u.id_usuario = v.id_usuario
      WHERE v.id_venda = ?
    `).get(req.params.id);

    if (!venda) return res.status(404).json({ erro: 'Venda não encontrada.' });

    const itens = db.prepare(`
      SELECT vi.*, p.nome AS produto_nome, p.categoria
      FROM VENDA_ITEM vi
      JOIN PRODUTO p ON p.id_produto = vi.id_produto
      WHERE vi.id_venda = ?
    `).all(req.params.id);

    res.json({ ...venda, itens });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
