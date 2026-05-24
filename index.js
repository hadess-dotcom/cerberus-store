const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  Routes,
  ChannelType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const express = require('express');
const axios = require('axios');

// 🔒 VARIÁVEIS DE AMBIENTE
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const MP_CLIENT_ID = process.env.MP_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET;

// 🎨 VISUAL ROXO ESCURO • IGUAL AO SEU EXEMPLO
const CONFIG = {
  nome: "Giggle Store",
  nomeAbreviado: "GIGGLE",
  corPrincipal: "#2B0B47",       // Roxo escuro fundo
  corDestaque: "#7B2CBF",        // Roxo claro detalhes
  corLaranja: "#FF8C00",         // Laranja igual exemplo
  corVerdeBotao: "#2ECC71",      // Botão "Adicionar ao carrinho"
  corErro: "#E74C3C",
  corSucesso: "#2ECC71",
  icones: {
    produto: "🌑",
    preco: "💸",
    estoque: "📥",
    config: "⚙️",
    dinheiro: "💰",
    venda: "🧾",
    usuario: "👤",
    editar: "✏️",
    deletar: "🗑️",
    design: "🎨",
    botao: "🔘",
    transferir: "🔄",
    pagamento: "💳",
    assinatura: "📅",
    backup: "💾",
    limpar: "🧹"
  },
  mensagemEntrega: `✅ **PAGAMENTO APROVADO!**
━━━━━━━━━━━━━━━━━━━━━━━
**Olá! Aqui está o que você comprou:**
\`\`\`
{conteudo}
\`\`\`
📌 *Guarde bem esse conteúdo, ele é único!*

🤝 **Obrigado por comprar na {nomeLoja}**
━━━━━━━━━━━━━━━━━━━━━━━`,
  descricaoPadrao: "Essa é uma descrição padrão do produto, clique no botão de configurações para configurar esse produto."
};

// 🚀 INICIALIZAÇÃO
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});
const app = express();
app.use(express.json());

// 📦 BANCO DE DADOS COMPLETO
let dadosLoja = {
  painelId: null,
  canalLogs: null,
  conectadoMP: false,
  saldoUsuarios: {},
  vendasTotais: 0,
  lucroTotal: 0
};

// ESTRUTURA COMPLETA DO PRODUTO
let produtos = [];
let mpDados = { access_token: null, refresh_token: null, expires: null };

// 🔄 TOKEN MERCADO PAGO
async function pegarTokenValido() {
  if (mpDados.access_token && Date.now() < mpDados.expires) return mpDados.access_token;
  if (mpDados.refresh_token) {
    try {
      const res = await axios.post('https://api.mercadopago.com/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: mpDados.refresh_token,
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET
      });
      mpDados.access_token = res.data.access_token;
      mpDados.refresh_token = res.data.refresh_token;
      mpDados.expires = Date.now() + (res.data.expires_in * 1000);
      dadosLoja.conectadoMP = true;
      return mpDados.access_token;
    } catch { dadosLoja.conectadoMP = false; return null; }
  }
  dadosLoja.conectadoMP = false;
  return null;
}

// 🔗 CONEXÃO MP
app.get('/conectar', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send(`<h1 style="color:${CONFIG.corErro}">❌ Erro</h1>`);
  try {
    const auth = await axios.post('https://api.mercadopago.com/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${WEBHOOK_URL}/conectar`,
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET
    });
    mpDados.access_token = auth.data.access_token;
    mpDados.refresh_token = auth.data.refresh_token;
    mpDados.expires = Date.now() + (auth.data.expires_in * 1000);
    dadosLoja.conectadoMP = true;
    res.send(`
    <html style="font-family:Arial; text-align:center; padding-top:50px; background:${CONFIG.corPrincipal}; color:white;">
      <h1 style="color:${CONFIG.corSucesso}">✅ CONECTADO!</h1>
      <p>Sua loja está pronta!</p>
    </html>`);
  } catch {
    res.send(`<h1 style="color:${CONFIG.corErro}">❌ Falha ao conectar</h1>`);
  }
});

// 📩 WEBHOOK DE PAGAMENTO E ENTREGA
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment') return res.sendStatus(200);
    const token = await pegarTokenValido();
    if (!token) return res.sendStatus(401);

    const mp = new MercadoPagoConfig({ accessToken: token });
    const pagamento = await new Payment(mp).get({ id: data.id });

    if (pagamento.status === 'approved') {
      const [usuarioId, produtoId, variacaoId] = pagamento.external_reference.split('|');
      const produto = produtos.find(p => p.id === produtoId);
      if (!produto) return res.sendStatus(200);

      const variacao = produto.variacoes?.find(v => v.id === variacaoId) || produto;

      // ✅ VERIFICA ESTOQUE
      if (variacao.estoque.length === 0) {
        if (dadosLoja.canalLogs) client.channels.cache.get(dadosLoja.canalLogs)?.send(`❌ **ESTOQUE ESGOTADO:** ${produto.nome}`);
        return res.sendStatus(200);
      }

      // ✅ PEGA 1 LINHA E REMOVE DO ESTOQUE
      const conteudoEntrega = variacao.estoque.shift();

      // ✅ ATUALIZA ESTATÍSTICAS
      dadosLoja.vendasTotais += 1;
      dadosLoja.lucroTotal += variacao.preco;
      dadosLoja.saldoUsuarios[usuarioId] = (dadosLoja.saldoUsuarios[usuarioId] || 0) + variacao.preco;

      try {
        // 📨 ENVIA PARA O CLIENTE
        const usuario = await client.users.fetch(usuarioId);
        await usuario.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ COMPRA APROVADA")
              .setDescription(CONFIG.mensagemEntrega.replace('{conteudo}', conteudoEntrega).replace('{nomeLoja}', CONFIG.nome))
              .setColor(CONFIG.corSucesso)
              .setThumbnail(produto.banner || client.user.displayAvatarURL())
              .setTimestamp()
          ]
        });

        // 📋 LOGS COMPLETOS
        if (dadosLoja.canalLogs) {
          const canal = client.channels.cache.get(dadosLoja.canalLogs);
          if (canal) canal.send({
            embeds: [
              new EmbedBuilder()
                .setTitle("📝 NOVA VENDA REALIZADA")
                .addFields(
                  { name: "👤 Comprador", value: `<@${usuarioId}>`, inline: true },
                  { name: "📦 Produto", value: produto.nome, inline: true },
                  { name: "💸 Valor", value: `R$ ${variacao.preco.toFixed(2)}`, inline: true },
                  { name: "📦 Estoque Restante", value: `${variacao.estoque.length}`, inline: true }
                )
                .setColor(CONFIG.corDestaque)
                .setTimestamp()
            ]
          });
        }
      } catch {}
    }
    res.sendStatus(200);
  } catch { res.sendStatus(500) }
});

app.listen(3000, () => console.log("✅ Sistema Online • GIGGLE • ROXO ESCURO"));

// 📋 TODOS OS COMANDOS • IGUAL SUA LISTA
const comandos = [
  // ⚙️ CONFIGURAÇÕES
  new SlashCommandBuilder()
    .setName('config')
    .setDescription("[ADM] Configure meus sistemas")
    .addSubcommand(sub => sub.setName('pagamentos').setDescription("Conectar Mercado Pago"))
    .addSubcommand(sub => sub.setName('logs').setDescription("Definir canal de logs")
      .addChannelOption(opt => opt.setName('canal').setRequired(true))),

  new SlashCommandBuilder()
    .setName('config-painel')
    .setDescription("[ADM] Configura um painel de produtos"),

  // 🛒 PRODUTOS
  new SlashCommandBuilder()
    .setName('add-produto')
    .setDescription("[ADM] Cria um produto")
    .addChannelOption(opt => opt.setName('canal').setRequired(true))
    .addStringOption(opt => opt.setName('nome').setRequired(true))
    .addNumberOption(opt => opt.setName('preco').setRequired(true))
    .addStringOption(opt => opt.setName('descricao').setRequired(false).setDescription("Padrão igual exemplo"))
    .addStringOption(opt => opt.setName('estoque').setRequired(true).setDescription("Linhas separadas por enter"))
    .addStringOption(opt => opt.setName('banner').setRequired(false).setDescription("Link da imagem")),

  new SlashCommandBuilder()
    .setName('criar-painel')
    .setDescription("[ADM] Cria um painel no servidor"),

  new SlashCommandBuilder()
    .setName('criados')
    .setDescription("[ADM] Mostra todos os produtos, cupons..."),

  // 💳 SALDO E PAGAMENTOS
  new SlashCommandBuilder()
    .setName('saldo')
    .setDescription("Veja seu saldo")
    .addSubcommand(sub => sub.setName('adicionar').setDescription("[ADM] Adicionar saldo")
      .addUserOption(opt => opt.setName('usuario').setRequired(true))
      .addNumberOption(opt => opt.setName('valor').setRequired(true)))
    .addSubcommand(sub => sub.setName('remover').setDescription("[ADM] Remover saldo")
      .addUserOption(opt => opt.setName('usuario').setRequired(true))
      .addNumberOption(opt => opt.setName('valor').setRequired(true)))
    .addSubcommand(sub => sub.setName('zerar').setDescription("[ADM] Zerar saldo")
      .addUserOption(opt => opt.setName('usuario').setRequired(true))),

  new SlashCommandBuilder()
    .setName('sacar')
    .setDescription("Use para sacar dinheiro dentro do bot"),

  new SlashCommandBuilder()
    .setName('giggle-pay')
    .setDescription("Gerencia sua conta giggle pay"),

  // 🎟️ CUPONS E KEYS
  new SlashCommandBuilder()
    .setName('cupom')
    .setDescription("[ADM] Sistema de cupons")
    .addSubcommand(sub => sub.setName('criar').setDescription("Criar cupom"))
    .addSubcommand(sub => sub.setName('deletar').setDescription("Deletar cupom")),

  new SlashCommandBuilder()
    .setName('key')
    .setDescription("[ADM] Sistema de Keys")
    .addSubcommand(sub => sub.setName('gerar').setDescription("Gerar key"))
    .addSubcommand(sub => sub.setName('deletar').setDescription("Deletar key")),

  // 🎫 TICKETS
  new SlashCommandBuilder()
    .setName('ticket-config')
    .setDescription("[ADM] Configura painel de ticket"),

  // 📊 ESTATÍSTICAS
  new SlashCommandBuilder()
    .setName('extrato')
    .setDescription("[ADM] Gerencia o extrato dos usuários"),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Veja o rank de compras do servidor"),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Veja estatísticas de conexão"),

  new SlashCommandBuilder()
    .setName('conta')
    .setDescription("Veja informações da sua conta"),

  new SlashCommandBuilder()
    .setName('premium')
    .setDescription("Veja informações e assine o Giggle Premium"),

  // 🔌 CONEXÕES
  new SlashCommandBuilder()
    .setName('conectar')
    .setDescription("[ADM] Conecta o BOT em um canal de voz"),

  new SlashCommandBuilder()
    .setName('desconectar')
    .setDescription("[ADM] Desconecta o BOT de um canal de voz")

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registrarComandos() {
  try { await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: comandos }); }
  catch (e) { console.error(e); }
}

// 🚀 BOT PRONTO
client.once('ready', () => {
  console.log(`✅ ${CONFIG.nome} • ONLINE | ROXO ESCURO`);
  registrarComandos();
  client.user.setActivity({ name: "GIGGLE STORE", type: 3 });
});

function ehAdmin(i) { return i.member.permissions.has(PermissionsBitField.Flags.Administrator); }

// 🧩 INTERAÇÕES E COMANDOS
client.on('interactionCreate', async i => {

  // ⚙️ /CONFIG
  if (i.commandName === 'config') {
    if (!ehAdmin(i)) return i.reply({ content: "❌ Sem permissão", ephemeral: true });

    if (i.options.getSubcommand() === 'pagamentos') {
      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(dadosLoja.conectadoMP ? "✅ CONECTADO" : "💳 CONECTAR MP")
          .setStyle(dadosLoja.conectadoMP ? ButtonStyle.Success : ButtonStyle.Primary)
          .setCustomId('conectar_mp')
          .setDisabled(dadosLoja.conectadoMP),
        new ButtonBuilder()
          .setLabel("🔄 VERIFICAR")
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('verificar_mp')
      );

      return i.reply({
        embeds: [new EmbedBuilder()
          .setTitle("⚙️ CONFIG • PAGAMENTOS")
          .setDescription(`Status: ${dadosLoja.conectadoMP ? "✅ OPERACIONAL" : "❌ NÃO CONECTADO"}`)
          .setColor(CONFIG.corPrincipal)],
        components: [botoes], ephemeral: true
      });
    }

    if (i.options.getSubcommand() === 'logs') {
      dadosLoja.canalLogs = i.options.getChannel('canal').id;
      return i.reply({ content: "✅ Canal de logs definido!", ephemeral: true });
    }
  }

  // 🔘 CONECTAR MP
  if (i.isButton() && i.customId === 'conectar_mp') {
    if (!ehAdmin(i)) return;
    const link = `https://auth.mercadopago.com.br/authorization?client_id=${MP_CLIENT_ID}&response_type=code&redirect_uri=${WEBHOOK_URL}/conectar&scope=read%20write%20offline_access`;
    return i.reply({ embeds: [new EmbedBuilder().setDescription(`🔗 **[CLIQUE AQUI PARA CONECTAR](${link})**`).setColor(CONFIG.corPrincipal)], ephemeral: true });
  }

  // ➕ /ADD-PRODUTO • VISUAL IGUAL SUA IMAGEM
  if (i.commandName === 'add-produto') {
    if (!ehAdmin(i)) return;
    const canal = i.options.getChannel('canal');
    const nome = i.options.getString('nome');
    const preco = i.options.getNumber('preco');
    const descricao = i.options.getString('descricao') || CONFIG.descricaoPadrao;
    const linhasEstoque = i.options.getString('estoque').split('\n').filter(Boolean);
    const banner = i.options.getString('banner') || null;

    const produto = {
      id: Math.random().toString(36).substr(2, 9),
      nome, descricao, preco, banner,
      estoque: linhasEstoque,
      criadoPor: i.user.id,
      dataCriacao: new Date().toLocaleString('pt-BR'),
      vendas: 0,
      lucro: 0,
      corEmbed: CONFIG.corLaranja
    };
    produtos.push(produto);

    // 🎨 EMBED 100% IGUAL AO SEU EXEMPLO
    const embedProduto = new EmbedBuilder()
      .setTitle(`🐉 ${produto.nome} # 2K | Produto`)
      .setDescription(`\`\`\`${produto.descricao}\`\`\`

${CONFIG.icones.produto} | **Produto:** ${produto.nome}
${CONFIG.icones.preco} | **Preço:** R$ ${produto.preco.toFixed(2)}
${CONFIG.icones.estoque} | **Estoque:** ${produto.estoque.length}`)
      .setColor(produto.corEmbed)
      .setThumbnail("https://i.imgur.com/7Z7Z7Z7.png")
      .setImage(produto.banner)
      .setFooter({ text: "GIGGLE • ATUALIZAÇÕES CONSTANTES" })
      .setTimestamp();

    // 🔘 BOTÕES VERDES E CONFIG
    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`comprar_${produto.id}`)
        .setLabel("🛒 Adicionar ao carrinho")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🛍️"),
      new ButtonBuilder()
        .setCustomId(`config_produto_${produto.id}`)
        .setLabel("")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⚙️")
    );

    await canal.send({ embeds: [embedProduto], components: [botoes] });
    return i.reply({ content: `✅ Produto criado com sucesso no canal <#${canal.id}>`, ephemeral: true });
  }

  // ⚙️ MENU DE CONFIGURAÇÃO DO PRODUTO • IGUAL SUA IMAGEM
  if (i.isButton() && i.customId.startsWith('config_produto_')) {
    if (!ehAdmin(i)) return;
    const produto = produtos.find(p => p.id === i.customId.split('_')[2]);
    if (!produto) return i.reply({ content: "❌ Produto não encontrado", ephemeral: true });

    // 📋 EMBED DE ESTATÍSTICAS
    const embedStats = new EmbedBuilder()
      .setTitle(`🐉 ${produto.nome} # 2K — Configurações do produto`)
      .addFields(
        { name: "💰 Lucro total", value: `R$ ${produto.lucro.toFixed(2)}`, inline: true },
        { name: "🧾 Total de vendas", value: `${produto.vendas}`, inline: true },
        { name: "📋 Ultima venda", value: produto.vendas > 0 ? "Realizada" : "Nenhuma venda", inline: true },
        { name: "👤 Criado por", value: `<@${produto.criadoPor}>`, inline: true },
        { name: "🚚 Entrega", value: "Carrinho", inline: true },
        { name: "⏳ Data de criação", value: produto.dataCriacao, inline: true }
      )
      .setColor(CONFIG.corPrincipal)
      .setFooter({ text: `ID: ${produto.id}` });

    // 📜 MENU COM TODAS AS OPÇÕES
    const menuConfig = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('menu_config_produto')
        .setPlaceholder("Selecione um menu pra configurar")
        .addOptions([
          { label: "Desbloquear", description: "Desbloquear o Produto", value: "desbloquear", emoji: "🔓" },
          { label: "Gerais", description: "Configurações gerais do produto", value: "gerais", emoji: "📝" },
          { label: "Preços", description: "Configurar preço do produto", value: "precos", emoji: "💰" },
          { label: "Estoque", description: "Configurar o estoque do produto", value: "estoque", emoji: "📦" },
          { label: "Transferir Produto", description: "Transferir produto de canal", value: "transferir", emoji: "🔄" },
          { label: "Assinaturas [experimental]", description: "Configurar assinatura", value: "assinaturas", emoji: "📅" },
          { label: "Formas de pagamento", description: "Configurar formas de pagamento", value: "pagamento", emoji: "🤝" },
          { label: "Design", description: "Configurar o design do produto", value: "design", emoji: "🎨" },
          { label: "Botões", description: "Configurar botões do produto", value: "botoes", emoji: "🔘" },
          { label: "Deletar", description: "Deletar produto do servidor", value: "deletar", emoji: "🗑️" }
        ])
    );

    return i.reply({ embeds: [embedStats], components: [menuConfig], ephemeral: true });
  }

  // 📂 SUBMENUS DE CONFIGURAÇÃO
  if (i.isStringSelectMenu() && i.customId === 'menu_config_produto') {
    const opcao = i.values[0];
    const produtoId = i.message.embeds[0].footer.text.split(': ')[1];
    const produto = produtos.find(p => p.id === produtoId);

    // 📦 MENU DE ESTOQUE
    if (opcao === 'estoque') {
      const embedEstoque = new EmbedBuilder()
        .setTitle("📦 Estoque")
        .setDescription(`Olá <@${i.user.id}>, seja bem vindo ao sistema de gerenciamento do estoque, utilize os botões abaixo para gerenciar determinado setor do estoque

📦 | **Itens:** ${produto.estoque.length} unid.
🛡️ | **Modo:** Único
💾 | **Tipo:** Texto`)
        .setColor(CONFIG.corPrincipal)
        .setFooter({ text: "Giggle © Todos os direitos reservados" });

      const menuEstoque = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('gerenciar_estoque')
          .setPlaceholder("Selecione uma opção para continuar")
          .addOptions([
            { label: "Gerenciar (Online)", description: "Gerencia via site", value: "online", emoji: "💻" },
            { label: "Gerenciar", description: "Gerenciar estoque", value: "gerenciar", emoji: "🛍️" },
            { label: "Backup", description: "Salvar backup", value: "backup", emoji: "💾" },
            { label: "Limpar", description: "Apagar todo estoque", value: "limpar", emoji: "⚠️" },
            { label: "Tipo", description: "Alterar tipo", value: "tipo", emoji: "📝" },
            { label: "Modo", description: "Alterar modo", value: "modo", emoji: "📥" }
          ])
      );

      return i.update({ embeds: [embedEstoque], components: [menuEstoque] });
    }

    // 🎨 MENU DE DESIGN • CORRIGIDO 100% COMPLETO
    if (opcao === 'design') {
      const modal = new ModalBuilder().setCustomId('modal_design').setTitle("🎨 Configurações Gerais");
      
      const linha1 = new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nome')
          .setLabel("Nome do produto")
          .setStyle(TextInputStyle.Short)
          .setValue(produto.nome)
          .setRequired(true)
      
