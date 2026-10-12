const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'dados.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    criarTabelas();
    seedUsuarios();
  }
  return db;
}

function criarTabelas() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS USUARIO (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT NOT NULL,
      login      TEXT NOT NULL UNIQUE,
      senha      TEXT NOT NULL,
      tipo       TEXT NOT NULL DEFAULT 'operador'
    );

    CREATE TABLE IF NOT EXISTS PRODUTO (
      id_produto        INTEGER PRIMARY KEY AUTOINCREMENT,
      nome              TEXT NOT NULL,
      categoria         TEXT NOT NULL DEFAULT 'Geral',
      quantidade_atual  INTEGER NOT NULL DEFAULT 0,
      quantidade_minima INTEGER NOT NULL DEFAULT 0,
      preco             REAL NOT NULL DEFAULT 0,
      custo             REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS MOVIMENTACAO (
      id_movimentacao INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo            TEXT NOT NULL,
      data            TEXT NOT NULL,
      quantidade      INTEGER NOT NULL,
      id_produto      INTEGER NOT NULL,
      id_usuario      INTEGER NOT NULL,
      FOREIGN KEY(id_produto) REFERENCES PRODUTO(id_produto),
      FOREIGN KEY(id_usuario) REFERENCES USUARIO(id_usuario)
    );

    CREATE TABLE IF NOT EXISTS VENDA (
      id_venda   INTEGER PRIMARY KEY AUTOINCREMENT,
      numero     INTEGER NOT NULL,
      data       TEXT NOT NULL,
      hora       TEXT NOT NULL,
      total      REAL NOT NULL,
      pagamento  TEXT NOT NULL DEFAULT 'dinheiro',
      id_usuario INTEGER NOT NULL,
      FOREIGN KEY(id_usuario) REFERENCES USUARIO(id_usuario)
    );

    CREATE TABLE IF NOT EXISTS VENDA_ITEM (
      id_venda   INTEGER NOT NULL,
      id_produto INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco      REAL NOT NULL,
      custo      REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(id_venda)   REFERENCES VENDA(id_venda),
      FOREIGN KEY(id_produto) REFERENCES PRODUTO(id_produto)
    );
  `);
}

/* Cria contas padrão se a tabela estiver vazia */
function seedUsuarios() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM USUARIO').get().n;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO USUARIO (nome, login, senha, tipo) VALUES (?, ?, ?, ?)'
    );
    insert.run('Administrador', 'admin', 'admin', 'comerciante');
    insert.run('Operador', 'op', 'op', 'operador');
    console.log('→ Usuários padrão criados (admin/admin, op/op)');
  }
}

module.exports = { getDb };
