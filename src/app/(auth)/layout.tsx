export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: branding panel */}
      <aside
        className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 text-white overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(120% 80% at 0% 0%, #1e3a8a 0%, #0f172a 55%, #020617 100%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40 ring-1 ring-white/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">VendasApp</span>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.05]">
            Gestão de vendas{' '}
            <span className="text-blue-400">sem complicação.</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Controle estoque, registre vendas no PDV e acompanhe o desempenho do
            seu negócio em tempo real.
          </p>
          <ul className="space-y-3 text-slate-300">
            {[
              'PDV rápido com busca instantânea',
              'Controle de estoque com alertas',
              'Relatórios e indicadores em tempo real',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-sm text-slate-400">
          &copy; {new Date().getFullYear()} VendasApp &middot; Todos os direitos reservados
        </div>
      </aside>

      {/* Right: form */}
      <section className="flex-1 flex items-center justify-center bg-white p-6 sm:p-12">
        {children}
      </section>
    </div>
  )
}
