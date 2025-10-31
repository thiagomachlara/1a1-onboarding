export default function WalletSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-green-500 text-6xl mb-6">✅</div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Wallet Cadastrada!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Sua wallet foi cadastrada com sucesso e está sendo analisada pela nossa equipe de compliance.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 mb-1">Próximos passos:</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Análise KYT (Know Your Transaction) via Chainalysis</li>
                <li>Verificação de compliance pela equipe 1A1</li>
                <li>Aprovação final e liberação para operações</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 text-left">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Importante:</strong> Você receberá uma notificação assim que sua wallet 
                for aprovada e estiver pronta para receber USDT.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Tempo estimado de análise: <strong>1-2 dias úteis</strong>
          </p>
          
          <p className="text-sm text-gray-500">
            Em caso de dúvidas, entre em contato com nossa equipe de suporte.
          </p>
        </div>

        <div className="mt-8">
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    </div>
  );
}

