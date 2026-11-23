# AgroÁgua — plataforma de irrigação de precisão

O **AgroÁgua** é uma plataforma SaaS de irrigação de precisão voltada para pequenos e médios produtores rurais, integrada a uma simulação completa de automação com ESP32 e ao assistente virtual **AgroIA**.

A plataforma ajuda produtores a decidir **quando irrigar, quanto aplicar e qual sistema tem melhor custo-benefício**, combinando informações de solo, clima e cultura. As recomendações incluem lâmina (mm), volume (m³), horas de bomba, custo estimado (R$) e comparativo entre sistemas de irrigação.

> Esta é uma demonstração: os sensores são simulados e os dados de uso ficam salvos no navegador via `localStorage`. A plataforma está preparada para integração com leituras reais via API.

---

## Estrutura da aplicação

| Módulo | Arquivo de entrada | Descrição |
|---|---|---|
| **SaaS AgroÁgua** | `index.html` | Aplicação principal com Visão geral, Calculadora agronômica, Base de dados, Planos e assistente AgroIA. |
| **Automação ESP32** | `automacao-esp32.html` | Simulação interativa de hardware (ESP32, sensores capacitivos, relés, válvulas solenoides e bomba), integrada ao painel e acessível em tela cheia. |

---

## Como executar

### 1. Servidor Flask e Assistente AgroIA (Recomendado)

Requer Python 3.10 ou superior. Na pasta do projeto, prepare o ambiente uma única vez:

~~~powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
~~~

Inicie o servidor com **`iniciar-servidor.bat`** ou execute:

~~~powershell
.venv\Scripts\python.exe backend/app.py
~~~

Abra no navegador: [http://127.0.0.1:8124](http://127.0.0.1:8124). Para encerrar, pressione `Ctrl+C`.

#### Configuração da AgroIA (Groq / Gemini)

O backend em `backend/app.py` expõe:
- `GET /api/health`: informa a disponibilidade do servidor e o provedor ativo.
- `POST /api/chat`: processa mensagens de até 2000 caracteres e o histórico recente, consultando o modelo com a persona técnica em `backend/agroia.txt`.

Para ativar as respostas da IA:

1. Obtenha uma chave gratuita de API:
   - **Groq (Recomendado):** gratuita, ultrarrápida e sem fila de espera no [Groq Console](https://console.groq.com/keys).
   - **Gemini:** crie uma chave no [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Configure o arquivo `.env` (copie de `.env.example` se necessário):
   ~~~env
   LLM_PROVIDER=groq
   GROQ_API_KEY=sua_chave_groq_aqui
   GROQ_MODEL=qwen/qwen3.8-27b
   ~~~
   *(Para usar o Gemini, defina `LLM_PROVIDER=gemini`, `GEMINI_API_KEY=sua_chave` e `GEMINI_MODEL=gemini-3.8-flash`)*.
3. Reinicie o servidor com `iniciar-servidor.bat`.

As chaves ficam salvas estritamente no seu computador. O arquivo `.env` está no `.gitignore`.

---

### 2. Abertura direta

- **Windows:** Dê duplo clique em **`abrir-app.bat`** para iniciar um servidor local e abrir o SaaS automaticamente.
- **Navegador direto:** Abra **`index.html`** no navegador. A previsão do tempo usa a API Open-Meteo quando há conexão com a internet; offline, o app recorre à climatologia local.

---

## Funcionalidades do SaaS AgroÁgua

### Visão geral (Painel do produtor)
- **Recomendação diária:** irrigar agora, irrigar hoje ou aguardar, com lâmina (mm), volume (m³), custo estimado, tempo de bomba e janela horária recomendada.
- **Alertas por área:** lista interativa das áreas cadastradas que requerem irrigação imediata.
- **Leituras de sensores de solo:** simulação de umidade em três profundidades (20 cm, 40 cm e 60 cm), nível de bateria, sinal e telemetria.
- **Saúde do solo:** água disponível atual, capacidade de campo, ponto de murcha permanente e déficit hídrico.
- **Métricas consolidadas:** áreas monitoradas, sensores ativos, umidade média e estimativa de água e custos economizados.
- **Balanço hídrico e previsão:** projeção de umidade para 7 dias combinando evapotranspiração da cultura e chuva prevista.

### Calculadora agronômica
Processo guiado em 3 etapas para recomendação precisa:
1. **Dados da lavoura:** seleção entre os 224 municípios do Piauí, nome da área, área (ha), vazão da motobomba, tipo de solo, data de plantio e cultura (17 culturas cadastradas com Kc FAO-56).
2. **Umidade do solo:** leitura manual de sensores ou estimativa baseada no balanço hídrico local.
3. **Recomendação e comparativo de sistemas:** lâmina necessária e tabela comparativa dos quatro métodos:
   - Gotejamento (eficiência típica 90%)
   - Microaspersão (eficiência típica 85%)
   - Aspersão convencional (eficiência típica 70%)
   - Sulco / Inundação (eficiência típica 55%)

### Simulação de Automação ESP32
Disponível em **Operação → Automação ESP32** ou pelo arquivo `automacao-esp32.html`:
- Simulação de reservatório, bomba, filtro de disco, válvula mestre e 3 setores de irrigação.
- Controles interativos de chuva simulada, velocidade do relógio e limites de acionamento.
- Esquema de ligação completo: fonte 12V, conversor buck 5V, microcontrolador ESP32, módulo relé de 4 canais, diodos de proteção e sensores capacitivos.
- Código-fonte conceitual em C++/Arduino e documentação de calibração.

### Planos demonstrativos
- **Plano Gratuito:** até 2 ha, 1 sensor, 1 área, recomendação básica e previsão de 7 dias.
- **Plano Pro:** até 20 ha, 8 sensores, áreas ilimitadas, histórico de consumo e comparativo financeiro.

---

## Bases de dados municipais

A plataforma inclui uma base climática para todos os **224 municípios do Piauí**:

| Arquivo | Descrição |
|---|---|
| `dados/municipios_pi.json` | Base estruturada em JSON com totais anuais de chuva, ETo Penman-Monteith (FAO-56), temperatura e meses secos. |
| `dados/municipios_pi.js` | Mesma base formatada em JavaScript para carregamento local no navegador. |
| `dados/municipios_pi.csv` | Exportação tabular para uso em planilhas e análises externas. |
| `dados/base_dados.js` / `.json` | Parâmetros agronômicos (culturas, solos, sistemas) e estatísticas do Censo Agropecuário do IBGE. |
| `dados/indicadores_pi.csv` | Resumo de indicadores rurais e econômicos do Estado do Piauí. |

---

## Arquivos principais do projeto

| Arquivo | Função |
|---|---|
| `index.html` | Interface do SaaS AgroÁgua (painel, calculadora, relatórios e chat AgroIA). |
| `automacao-esp32.html` | Simulação interativa da bancada de automação ESP32. |
| `iniciar-servidor.bat` | Inicializador do servidor backend Flask com a API AgroIA. |
| `abrir-app.bat` | Inicializador rápido para abertura local no navegador. |
| `backend/app.py` | Servidor Flask e rotas da API (`/api/health` e `/api/chat`). |
| `backend/agroia.txt` | Persona e diretrizes agronômicas do assistente virtual. |

---

## Aviso legal

As recomendações e dados fornecidos pela plataforma são estimativas para demonstração e apoio à tomada de decisão. Elas não substituem a assistência técnica agronômica presencial nem a realização de projeto executivo de irrigação.
