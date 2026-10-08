export function SetupGuide() {
  return (
    <section className="setup" id="setup">
      <div className="setup-title">
        <span className="setup-icon" aria-hidden="true">
          ⌘
        </span>
        <div>
          <h2>Antes de começar</h2>
          <p>Prepare a conexão com o seu serviço.</p>
        </div>
      </div>
      <ol>
        <li>
          <span>1</span>
          <p>
            Suba o backend e execute o <strong>ngrok</strong>.
          </p>
        </li>
        <li>
          <span>2</span>
          <p>Credencie a URL pública do backend na plataforma.</p>
        </li>
        <li>
          <span>3</span>
          <p>
            Configure a <strong>URL do backend</strong> e reinicie o front.
          </p>
        </li>
      </ol>
      <details>
        <summary>Ver variável de ambiente</summary>
        <pre>VITE_API_BASE_URL=https://seu-backend.ngrok-free.app</pre>
        <p>
          O acompanhamento consulta GET /runs/&#123;run_id&#125;. A consulta
          atualiza o progresso a cada 5 segundos até a finalização.
        </p>
      </details>
    </section>
  );
}
