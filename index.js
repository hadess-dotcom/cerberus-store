const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  Routes,
  ChannelType
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const express = require('express');
const axios = require('axios');

// 🔒 SÓ ESSAS VARIÁVEIS AQUI
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// ⚙️ CONFIGS
const CONFIG = {
  nomeLoja: "Cerberus Store",
  cor: "#7B2CBF",
  mensagemEntrega: "✅ **Pagamento aprovado!**\n\nAqui está o que você comprou:\n`{conteudo}`\n\nObrigado por comprar conosco 🤝",
  icone: "🛒"
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

// 📦 BANCO DE DADOS
let paineis = new Map();
let produtos = [];
// 🔐 DADOS DO MERCADO PAGO (GUARDADOS AUTOMATICAMENTE)
let mpDados = {
  access_token: null,
  refresh_token: null,
  expires: null
};

// ✨ FUNÇÃO IGUAL GIGGLE: TUDO AUTOMÁTICO
async function pegarTokenValido() {
  if (mpDados.access_token && Date.now() < mpDados.expires) {
    return mpDados.access_token;
  }

  if (mpDados.refresh_token) {
    try {
      const novo = await axios.post('https://api.mercadopago.com/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: mpDados.refresh_token,
        client_id: '1000431382257348',
        client_secret: '8gYjM8uLqXyVbRwTzKpFdGmHnQaWsXcV'
      });

      mpDados.access_token = novo.data.access_token;
      mpDados.refresh_token = novo.data.refresh_token;
      mpDados.expires = Date.now() + (novo.data.expires_in * 1000);
      console.log("✅ Mercado Pago renovado automaticamente!");
      return mpDados.access_token;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// 🌐 ONDE O MERCADO PAGO ENVIA VOCÊ DEPOIS DE LOGAR
app.get('/conectar', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("❌ Erro ao conectar");

  try {
    const auth = await axios.post('https://api.mercadopago.com/oauth/token', {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${WEBHOOK_URL}/conectar`,
      client_id: '1000431382257348',
      client_secret: '8gYjM8uLqXyVbRwTzKpFdGmHnQaWsXcV'
    });

    mpDados.access_token = auth.data.access_token;
    mpDados.refresh_token = auth.data.refresh_token;
    mpDados.expires = Date.now() + (auth.data.expires_in * 1000);

    res.send("✅ **CONECTADO COM SUCESSO!** 🎉<br>Pode fechar essa aba, sua loja já está pronta.");
  } catch (e) {
    res.send("❌ Falha ao conectar, tente novamente.");
  }
});

// 🌐 WEBHOOK DE PAGAMENTO
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const token = await pegarTokenValido();
      if (!token) return res.sendStatus(401);

      const mp = new MercadoPagoConfig({ accessToken: token });
      const payment = new Payment(mp);
      const detalhe = await payment.get({ id: data.id });

      if (detalhe.status === 'approved') {
        const [usuarioId, produtoId] = detalhe.external_reference.split('|');
        const prod = produtos.find(p => p.id === produtoId);

        if (prod && prod.estoque.length > 0) {
          const entrega = prod.estoque.shift();
          try {
            await (await client.users.fetch(usuarioId)).send({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`✅ Compra Aprovada - ${CONFIG.nomeLoja}`)
                  .setDescription(CONFIG.mensagemEntrega.replace("{conteudo}", entrega))
                  .setColor(CONFIG.cor)
              ]
            });

            const canalLogs = client.channels.cache.get(paineis.get('config')?.canalLogs);
            if (canalLogs) canalLogs.send(`📥 **VENDA REALIZADA**\nUsuário: <@${usuarioId}>\nProduto: ${prod.nome}\nValor: R$ ${prod.preco.toFixed(2)}`);

          } catch (e) {}
        }
      }
    }
    res.sendStatus(200);
  } catch (e) { res.sendStatus(500) }
});

app.listen(3000, () => console.log('🌐 Sistema Online | Igual ao Giggle'));

// 📋 COMANDOS (CORRIGIDOS COM DESCRIÇÕES OBRIGATÓRIAS)
const comandos = [
  new SlashCommandBuilder().setName('config').setDescription("⚙️ Configurações da loja")
    .addSubcommand(s => 
      s.setName('pagamentos')
       .setDescription("💳 Conectar ou alterar forma de pagamento (Mercado Pago)"))
    .addSubcommand(s => 
      s.setName('logs')
       .setDescription("📝 Definir canal para registrar vendas")
       .addChannelOption(o => o.setName('canal').setDescription('Canal de texto para logs').setRequired(true))
    ),
  new SlashCommandBuilder().setName('criar-painel').setDescription('🏪 Cria o painel principal da loja em um canal')
    .addChannelOption(o => o.setName('canal').setDescription('Escolha o canal onde a loja aparecerá').setRequired(true)),
  new SlashCommandBuilder().setName('add-produto').setDescription('➕ Adiciona um produto diretamente no canal da loja')
    .addChannelOption(o => o.setName('canal').setDescription('Canal da loja').setRequired(true))
    .addStringOption(o => o.setName('nome').setDescription('Nome do produto').setRequired(true))
    .addNumberOption(o => o.setName('preco').setDescription('Preço em Reais (R$)').setRequired(true))
    .addStringOption(o => o.setName('descricao').setDescription('Descrição detalhada do produto').setRequired(true))
    .addStringOption(o => o.setName('entrega').setDescription('Conteúdo que será enviado após o pagamento').setRequired(true))
    .addIntegerOption(o => o.setName('estoque').setDescription('Quantidade disponível para venda').setRequired(true)),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registrarComandos() {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: comandos });
    console.log('✅ Comandos registrados com sucesso!');
  } catch (e) { console.error(e) }
}

// 🚀 BOT LIGADO
client.once('clientReady', () => {
  console.log(`✅ ${CONFIG.nomeLoja} Online | ${client.user.tag}`);
  registrarComandos();
  client.user.setActivity(`${CONFIG.icone} | Loja Automática`, { type: 3 });
});

function ehAdmin(i) { return i.member.permissions.has('Administrator'); }

// 🧩 INTERAÇÕES
client.on('interactionCreate', async i => {

  // ⚙️ /CONFIG → IGUALZINHO O GIGGLE
  if (i.commandName === 'config') {
    if (!ehAdmin(i)) return i.reply({content:"❌ Você não tem permissão!", ephemeral:true});

    if (i.options.getSubcommand() === 'pagamentos') {
      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("💳 Mercado Pago")
          .setStyle(ButtonStyle.Primary)
          .setCustomId('conectar_mp'),
        new ButtonBuilder()
          .setLabel("❓ O que é isso?")
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('ajuda_pag')
      );

      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚙️ CONFIGURAR PAGAMENTOS")
            .setDescription("Escolha a forma que deseja usar:\n\n✅ **Mercado Pago** → Automático, PIX na hora, entrega rápida\n❓ Clique para saber mais")
            .setColor(CONFIG.cor)
        ], components: [botoes], ephemeral:true
      });
    }

    if (i.options.getSubcommand() === 'logs') {
      const canal = i.options.getChannel('canal');
      paineis.set('config', { canalLogs: canal.id });
      return i.reply({content:`✅ Logs salvos em ${canal}!`, ephemeral:true});
    }
  }

  // 🔘 BOTÃO DE CONECTAR MERCADO PAGO → IGUAL O GIGGLE
  if (i.isButton() && i.customId === 'conectar_mp') {
    if (!ehAdmin(i)) return;

    const link = `https://auth.mercadopago.com.br/authorization?client_id=1000431382257348&response_type=code&redirect_uri=${WEBHOOK_URL}/conectar&scope=read%20write%20offline_access`;

    return i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔗 CONECTAR MERCADO PAGO")
          .setDescription(`Clique no link abaixo, entre com sua conta e permita o acesso:\n\n${link}\n\n✅ **É SÓ ISSO!** O resto o sistema faz sozinho, igual você está acostumado.`)
          .setColor(CONFIG.cor)
      ], ephemeral:true
    });
  }

  // 🏪 /CRIAR-PAINEL
  if (i.commandName === 'criar-painel') {
    if (!ehAdmin(i)) return;
    const canal = i.options.getChannel('canal');
    if (canal.type !== ChannelType.GuildText) return i.reply({content:"❌ Escolha um canal de texto válido!", ephemeral:true});

    const capa = new EmbedBuilder()
      .setTitle(`${CONFIG.icone} ${CONFIG.nomeLoja}`)
      .setDescription("**Bem-vindo!**\nTodos os produtos estão listados abaixo.\nClique em **COMPRAR** → Pague via PIX → Receba na DM ✅")
      .setColor(CONFIG.cor)
      .setThumbnail(client.user.displayAvatarURL());

    await canal.send({ embeds: [capa] });
    paineis.set(canal.id, { canalId: canal.id });
    return i.reply({content:`✅ Painel criado em ${canal}!`, ephemeral:true});
  }

  // ➕ /ADD-PRODUTO → APARECE DIRETO NO CANAL
  if (i.commandName === 'add-produto') {
    if (!ehAdmin(i)) return;
    const canal = i.options.getChannel('canal');

    const dadosProduto = {
      id: Date.now().toString(),
      nome: i.options.getString('nome'),
      preco: i.options.getNumber('preco'),
      descricao: i.options.getString('descricao'),
      entrega: i.options.getString('entrega'),
      estoque: Array(i.options.getInteger('estoque')).fill(i.options.getString('entrega')),
      canalId: canal.id
    };

    produtos.push(dadosProduto);

    const embedProduto = new EmbedBuilder()
      .setTitle(`📌 ${dadosProduto.nome}`)
      .setDescription(`**📝 Descrição:**\n${dadosProduto.descricao}\n\n💸 **Preço:** \`R$ ${dadosProduto.preco.toFixed(2)}\`\n📦 **Estoque:** \`${dadosProduto.estoque.length}\``)
      .setColor(CONFIG.cor);

    const botaoComprar = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`comprar_${dadosProduto.id}`)
        .setLabel("💳 COMPRAR AGORA")
        .setStyle(ButtonStyle.Success)
    );

    await canal.send({ embeds: [embedProduto], components: [botaoComprar] });
    return i.reply({content:`✅ Produto publicado em ${canal}!`, ephemeral:true});
  }

  // 💳 BOTÃO DE COMPRAR → TUDO AUTOMÁTICO
  if (i.isButton() && i.customId.startsWith('comprar_')) {
    const prodId = i.customId.split('_')[1];
    const prod = produtos.find(p => p.id === prodId);

    if (!prod) return i.reply({content:"❌ Produto não existe ou foi removido!", ephemeral:true});
    if (prod.estoque.length === 0) return i.reply({content:"❌ Produto esgotado!", ephemeral:true});

    try {
      const token = await pegarTokenValido();
      if (!token) return i.reply({content:"❌ Primeiro conecte o Mercado Pago usando /config pagamentos", ephemeral:true});

      const mp = new MercadoPagoConfig({ accessToken: token });
      const payment = new Payment(mp);

      const pagamento = await payment.create({
        body: {
          transaction_amount: prod.preco,
          description: `Compra: ${prod.nome}`,
          payment_method_id: 'pix',
          payer: { email: `user_${i.user.id}@loja.com` },
          external_reference: `${i.user.id}|${prod.id}`,
          notification_url: `${WEBHOOK_URL}/webhook`
        }
      });

      const qr = pagamento.point_of_interaction.transaction_data;

      const embedPix = new EmbedBuilder()
        .setTitle("💳 PAGAMENTO GERADO")
        .setDescription(`**🛒 Produto:** ${prod.nome}\n**💸 Valor:** R$ ${prod.preco.toFixed(2)}\n\n📲 **Código PIX:**\n\`\`\`${qr.qr_code}\`\`\`\n✅ Pague e receba na hora!`)
        .setColor(CONFIG.cor)
        .setImage(`data:image/png;base64,${qr.qr_code_base64}`);

      return i.reply({ embeds: [embedPix], ephemeral: true });

    } catch (e) {
      return i.reply({content:"❌ Erro na transação, verifique a conexão com o Mercado Pago", ephemeral:true});
    }
  }

});

client.login(TOKEN);

