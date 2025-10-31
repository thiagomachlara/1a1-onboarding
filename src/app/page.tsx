import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Image
              src="/1a1-logo.png"
              alt="1A1 Cripto"
              width={200}
              height={60}
              priority
            />
            <a
              href="https://1a1cripto.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Voltar para o site
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Bem-vindo à 1A1 Cripto
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Verificação de Cadastro Segura e Rápida
          </p>
          <p className="text-base text-gray-500">
            Complete seu cadastro em poucos minutos e comece a negociar USDT com segurança
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Como funciona?
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-gray-900 font-bold mr-4">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Informações Básicas
                  </h3>
                  <p className="text-gray-600">
                    Preencha seus dados pessoais ou da empresa
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-gray-900 font-bold mr-4">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Envio de Documentos
                  </h3>
                  <p className="text-gray-600">
                    Faça upload dos documentos necessários de forma segura
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-gray-900 font-bold mr-4">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Verificação
                  </h3>
                  <p className="text-gray-600">
                    Nossa equipe analisa seus documentos em até 24 horas
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Escolha o tipo de cadastro:
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/onboarding/individual"
                className="group block p-6 bg-gray-50 hover:bg-yellow-50 border-2 border-gray-200 hover:border-yellow-400 rounded-xl transition-all duration-200"
              >
                <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-yellow-600">
                  Pessoa Física
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Para indivíduos que desejam negociar criptomoedas
                </p>
                <span className="inline-flex items-center text-sm font-semibold text-gray-900 group-hover:text-yellow-600">
                  Iniciar verificação →
                </span>
              </Link>

              <Link
                href="/onboarding/company"
                className="group block p-6 bg-gray-50 hover:bg-yellow-50 border-2 border-gray-200 hover:border-yellow-400 rounded-xl transition-all duration-200"
              >
                <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-yellow-600">
                  Pessoa Jurídica
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Para empresas e intermediadores de criptomoedas
                </p>
                <span className="inline-flex items-center text-sm font-semibold text-gray-900 group-hover:text-yellow-600">
                  Iniciar verificação →
                </span>
              </Link>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Seus dados estão seguros
                </h4>
                <p className="text-sm text-blue-800">
                  Utilizamos a plataforma Sumsub, líder mundial em verificação de identidade,
                  com certificações SOC 2 Type 2, ISO 27001 e conformidade com LGPD.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p className="mb-2">
            Dúvidas? Entre em contato:
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
            <a
              href="mailto:thiago.lara@1a1cripto.com"
              className="text-yellow-600 hover:text-yellow-700 font-semibold"
            >
              thiago.lara@1a1cripto.com
            </a>
            <span className="hidden sm:inline text-gray-400">|</span>
            <a
              href="mailto:compliance@1a1cripto.com"
              className="text-yellow-600 hover:text-yellow-700 font-semibold"
            >
              compliance@1a1cripto.com
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

