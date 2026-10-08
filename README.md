<p align="center">
</p>

<h1 align="center">Processamento de SKUs em lote</h1>

<p align="center">
  Inicie lotes, acompanhe o progresso e consulte os resultados em um só painel.
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-24.18.0-339933?logo=nodedotjs&logoColor=white" alt="Node.js 24.18.0" /></a>
  <a href="https://ngrok.com/"><img src="https://img.shields.io/badge/ngrok-3.39.9-1F1E37?logo=ngrok&logoColor=white" alt="ngrok 3.39.9" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-29.1.3-2496ED?logo=docker&logoColor=white" alt="Docker 29.1.3" /></a>
  <img src="https://img.shields.io/badge/Compose-2.40.3-2496ED?logo=docker&logoColor=white" alt="Docker Compose 2.40.3" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Testes-passando-2E7D32?logo=checkmarx&logoColor=white" alt="Testes passando na validação local" />
  <img src="https://img.shields.io/badge/Build-aprovado-2E7D32" alt="Build aprovado na validação local" />
  <img src="https://img.shields.io/badge/Lint-sem_erros-2E7D32" alt="Lint sem erros na validação local" />
</p>

Badges de validação local em 08/10/2026.

API em NestJS, painel em React e processamento em filas BullMQ.

## Como rodar

1. Copie `backend/.env.example` para `backend/.env` e preencha `PLATFORM_BASE_URL`.
2. Suba o front, a API e os serviços:

   ```sh
   docker compose up -d --build
   ```

3. Rode `ngrok http 3000`, registre a URL pública com `/register` na plataforma e preencha `PLATFORM_CID` e `PLATFORM_TOKEN` no `.env` do backend.
4. Aplique as credenciais e inicie o worker:

   ```sh
   docker compose --profile registered up -d --force-recreate api worker
   ```

O front aponta para `http://localhost:3000` por padrão. Para usar outra URL, defina `VITE_API_BASE_URL` em `frontend/.env` e recrie o serviço com `docker compose up -d --force-recreate frontend`.

Abra o [painel](http://localhost:5173) e clique em **Iniciar processamento**. Os lotes são atualizados a cada 5 segundos até finalizar.

- Api: [localhost:3000](http://localhost:3000)
- Swagger: [localhost:3000/docs](http://localhost:3000/docs).
- Front: [localhost:5173](http://localhost:5173)
