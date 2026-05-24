const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  Routes,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const express = require('express');
const axios = require('axios');

// 🔒 ENV
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const MP_CLIENT_ID = process.env.MP_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET;

// 🎨 CONFIG
const CONFIG = {
  nome: "Giggle Store",
  corPrincipal: "#2B0B47",
  corDestaque: "#7B2CBF",
  corLaranja: "#FF8C00",
  corSucesso: "#2ECC71",
  corErro: "#E74C3C"
};

// 🚀 CLIENT
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

// 📦 DB
let produtos = [];
let dadosLoja = {
  canalLogs: null,
  conectadoMP: false,
  vendasTotais: 0,
  lucroTotal: 0,
  saldoUsuarios: {}
};

let mpDados = {
  access_token: null,
  refresh_token: null,
  expires: 0
};

// 🔄 TOKEN MP
async function pegarToken() {
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
      mpDados.expires = Date.now() + res.data.expires_in * 1000;

      return mpDados.access_token;
    } catch {
      return null;
    }
  }
  return null;
}

// 🌐 WEBHOOK
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment') return res.sendStatus(200);

    const token = await pegarToken();
    if (!token) return res.sendStatus(401);

    const mp = new MercadoPagoConfig({ accessToken: token });
    const pagamento = await new Payment(mp).get({ id: data.id });

    if (pagamento.status !== 'approved') return res.sendStatus(200);

    const [userId, prodId] = pagamento.external_reference.split('|');
    const produto = produtos.find(p => p.id === prodId);
    if (!produto) return res.sendStatus(200);

    const item = produto.estoque.shift();
    if (!item) return res.sendStatus(200);

    dadosLoja.vendasTotais++;

    const user = await client.users.fetch(userId);

    await user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ COMPRA APROVADA")
          .setDescription(`Seu item:\n\`\`\`${item}\`\`\``)
          .setColor(CONFIG.corSucesso)
      ]
    });

    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("🔥 BOT ONLINE"));

// 📋 COMANDOS
const commands = [
  new SlashCommandBuilder()
    .setName('add-produto')
    .setDescription('Criar produto')
    .addChannelOption(o => o.setName('canal').setRequired(true))
    .addStringOption(o => o.setName('nome').setRequired(true))
    .addNumberOption(o => o.setName('preco').setRequired(true))
    .addStringOption(o => o.setName('estoque').setRequired(true))
].map(c => c.toJSON());

// 🚀 REGISTRO
const rest = new REST({ version: '10' }).setToken(TOKEN);
async function register() {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
}

// 🤖 READY
client.once('ready', async () => {
  console.log("✅ ONLINE");
  await register();
});

// 🔘 INTERAÇÕES
client.on('interactionCreate', async i => {

  // ➕ ADD PRODUTO
  if (i.commandName === 'add-produto') {
    const canal = i.options.getChannel('canal');
    const nome = i.options.getString('nome');
    const preco = i.options.getNumber('preco');
    const estoque = i.options.getString('estoque').split('\n');

    const produto = {
      id: Math.random().toString(36).slice(2),
      nome,
      preco,
      estoque
    };

    produtos.push(produto);

    const embed = new EmbedBuilder()
      .setTitle(nome)
      .setDescription(`Preço: R$ ${preco}`)
      .setColor(CONFIG.corLaranja);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`config_${produto.id}`)
        .setLabel("Configurar")
        .setStyle(ButtonStyle.Secondary)
    );

    canal.send({ embeds: [embed], components: [row] });

    return i.reply({ content: "Produto criado!", ephemeral: true });
  }

  // ⚙️ BOTÃO CONFIG
  if (i.isButton() && i.customId.startsWith('config_')) {
    const id = i.customId.split('_')[1];
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const modal = new ModalBuilder()
      .setCustomId(`modal_${id}`)
      .setTitle("Editar Produto");

    const nome = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel("Nome")
      .setStyle(TextInputStyle.Short)
      .setValue(produto.nome);

    const preco = new TextInputBuilder()
      .setCustomId('preco')
      .setLabel("Preço")
      .setStyle(TextInputStyle.Short)
      .setValue(String(produto.preco));

    modal.addComponents(
      new ActionRowBuilder().addComponents(nome),
      new ActionRowBuilder().addComponents(preco)
    );

    return i.showModal(modal);
  }

  // 🧠 MODAL SAVE
  if (i.isModalSubmit()) {
    if (i.customId.startsWith('modal_')) {
      const id = i.customId.split('_')[1];
      const produto = produtos.find(p => p.id === id);
      if (!produto) return;

      produto.nome = i.fields.getTextInputValue('nome');
      produto.preco = Number(i.fields.getTextInputValue('preco'));

      return i.reply({ content: "Atualizado!", ephemeral: true });
    }
  }
});

// 🚀 LOGIN
client.login(TOKEN);
