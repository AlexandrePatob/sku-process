# Processamento de SKUs

Projeto base para processamento assíncrono de lotes de SKUs, com API REST, filas e interface de acompanhamento.

## Estrutura

- `backend/` — API e workers em NestJS.
- `frontend/` — Interface em React.
- `docker-compose.yml` — Ambiente Docker, previsto para a próxima etapa.

## Stack

- Node.js 24 e TypeScript
- NestJS e React
- BullMQ e Redis
- PostgreSQL e TypeORM
- OpenAPI / Swagger
- Jest e Pino

## Como rodar 

1. Copie `backend/.env.example` para `backend/.env` e configure as variáveis do ambiente.
``
PLATFORM_BASE_URL=Url do servico externo
``
2. Na raiz, rode `docker compose up -d` para subir PostgreSQL, Redis e API.
3. Rode `ngrok http 3000` e use a URL gerada para registrar o webhook (/register). Coloque o `cid` e o `token` recebidos em `backend/.env`.
``
PLATFORM_CID=
PLATFORM_TOKEN=
``
4. Rode `docker compose up -d worker` ou `npm run start:worker'. Depois, chame `POST http://localhost:3000/start-process` com os headers `x-cid` e `x-token` recebidos no registro.
Local via swagger:
http://localhost:3000/docs#/StartProcess/StartProcessController_start

via Curl:
``curl -X POST http://localhost:3000/start-process \
  -H "x-cid: SEU_CID" \
  -H "x-token: SEU_TOKEN"
``

A API fica em `http://localhost:3000` e o Swagger em `http://localhost:3000/docs`.

## Dependencias

- Node
- Docker
- Ngrok
- Npm 
