const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  Routes,
  PermissionsBitField
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const express = require('express');
const axios = require('axios');

// 🔒 ENV
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// 🎨 CONFIG
const CONFIG = {
  nome: "Giggle Store",
  corSucesso: "#2ECC71",
  corErro: "#E74C3C",
  corPrincipal: "#7B2CBF"
};

// 🤖 CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 📦 DB
let produtos = [];

// 🌐 EXPRESS (WEBHOOK FUTURO)
const app = express();
app.use(express.json());

app.listen(3000, () => console.log("🔥 Sistema Online"));

// 📋 SLASH COMMANDS (100% CORRIGIDO)
const commands = [

  new SlashCommandBuilder()
    .setName('add-produto')
    .setDescription('Criar um produto no sistema')
    .addChannelOption(opt =>
      opt
        .setName('canal')
        .setDescription('Canal onde o produto será enviado')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('nome')
        .setDescription('Nome do produto')
        .setRequired(true)
    )
    .addNumberOption(opt =>
      opt
        .setName('preco')
        .setDescription('Preço do produto')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('estoque')
        .setDescription('Itens separados por quebra de linha')
        .setRequired(true)
    ),

].map(cmd => cmd.toJSON());

// 🚀 REGISTER COMMANDS
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash Commands registrados");
  } catch (err) {
    console.error(err);
  }
}

// 🤖 READY
client.once('ready', async () => {
  console.log(`✅ ${CONFIG.nome} ONLINE`);
  await registerCommands();
});

// 🎯 INTERAÇÕES
client.on('interactionCreate', async (i) => {

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
      .setTitle(`🛒 ${nome}`)
      .setDescription(`💸 Preço: R$ ${preco.toFixed(2)}\n📦 Estoque: ${estoque.length}`)
      .setColor(CONFIG.corPrincipal);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`buy_${produto.id}`)
        .setLabel("Comprar")
        .setStyle(ButtonStyle.Success)
    );

    await canal.send({ embeds: [embed], components: [row] });

    return i.reply({ content: "✅ Produto criado!", ephemeral: true });
  }

  // 🛒 COMPRA (BÁSICO)
  if (i.isButton() && i.customId.startsWith('buy_')) {

    const id = i.customId.split('_')[1];
    const produto = produtos.find(p => p.id === id);

    if (!produto) {
      return i.reply({ content: "❌ Produto não encontrado", ephemeral: true });
    }

    const item = produto.estoque.shift();

    if (!item) {
      return i.reply({ content: "❌ Sem estoque", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ COMPRA REALIZADA")
      .setDescription(`Seu item:\n\`\`\`${item}\`\`\``)
      .setColor(CONFIG.corSucesso);

    return i.reply({ embeds: [embed], ephemeral: true });
  }
});

// 🚀 LOGIN
client.login(TOKEN);
