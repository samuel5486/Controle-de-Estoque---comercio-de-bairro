# Caixa e Estoque

MVP do Sistema de Controle de Estoque de Comércio de Bairro, desenvolvido como atividade prática do curso no IFPA.

## Sobre o projeto

Sistema web (frente de caixa + controle de estoque) voltado a pequenos comércios de bairro, criado a partir de uma entrevista real com um comerciante de Tucuruí/PA, que revelou a falta de rotina no controle de estoque como principal problema do negócio.

Este MVP implementa os casos de uso definidos no diagrama de caso de uso do projeto: cadastro de produto, registro de entrada/saída, alerta de estoque baixo, consulta de estoque, planejamento de reposição, geração de relatório e autenticação de usuário.

## Como usar

Basta abrir o arquivo `index.html` em qualquer navegador — não precisa de instalação, servidor ou internet (exceto para carregar a fonte do Google Fonts).

Se estiver usando GitHub Pages, o link fica disponível automaticamente em:
`https://<seu-usuario>.github.io/<nome-do-repositorio>/`

## Funcionalidades

- **Login com senha** — cada operador (Comerciante ou Funcionário) tem sua própria conta, criada no primeiro acesso
- **Caixa (PDV)** — venda por toque, com cupom, cálculo automático de total e baixa de estoque
- **Forma de pagamento** — Dinheiro, Crédito, Débito, Pix ou Vale-alimentação
- **Estoque** — agrupado por categoria, com busca e filtro, alerta visual de estoque baixo/zerado, exclusão de produto
- **Reposição** — lista automática de produtos abaixo do mínimo, com sugestão de quantidade a comprar
- **Entrada de mercadoria** — com atalho para os produtos que mais precisam de reposição
- **Vendas realizadas** — histórico com detalhe de cada venda ao clicar
- **Painel, Relatório e Financeiro** — exclusivos do perfil Comerciante, com gráficos de vendas por categoria, tendência dos últimos 7 dias, produtos mais vendidos e lucro por mês


## Tecnologias

HTML, CSS e JavaScript puro (sem frameworks nem dependências externas de bibliotecas) — mantendo o projeto leve, autocontido e alinhado com a arquitetura em camadas definida na documentação do projeto.

## Autor

Samuel — Instituto Federal do Pará (IFPA)
