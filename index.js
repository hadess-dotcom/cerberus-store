const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  Routes
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const express = require('express');

// 🔒 VARIÁVEIS DO RAILWAY
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// ⚙️ CONFIGS
const COR = "#5865F2";
const NOME_LOJA = "Cerberus Store";

// 🚀 INICIALIZAÇÃO
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const mp = new MercadoPagoConfig({ accessToken: MP_TOKEN });
const payment = new Payment(mp);
const app = express();
app.use(express.json());

// 📦 BANCO DE DADOS
let loja = { logs: null, cargoComprador: null };
let produtos = [];

// 🌐 WEBHOOK
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const detalhe = await payment.get({ id: data.id });
      if (detalhe.status === 'approved') {
        const [usuarioId, prodId] = detalhe.external_reference.split('|');
        const prod = produtos.find(p => p.id === prodId);
        if (prod && prod.estoque.length > 0) {
          const entrega = prod.estoque.shift();
          try {
            await (await client.users.fetch(usuarioId)).send({
              embeds: [new EmbedBuilder().setTitle("✅ Pagamento Aprovado").setDescription(`\`\`\`${entrega}\`\`\``).setColor('Green')]
            });
            if (loja.logs) client.channels.cache.get(loja.logs)?.send(`📥 VENDA: <@${usuarioId}> | ${prod.nome}`);
            if (loja.cargoComprador) client.guilds.cache.get(GUILD_ID)?.members.cache.get(usuarioId)?.roles.add(loja.cargoComprador);
          } catch (e) {}
        }
      }
    }
    res.sendStatus(200);
  } catch (e) { res.sendStatus(500) }
});
app.listen(3000, () => console.log('🌐 Webhook OK'));

// 📋 REGISTRAR COMANDOS (ESSA PARTE É A CHAVE)
const comandos = [
  new SlashCommandBuilder().setName('loja').setDescription('🛒 Abrir loja'),
  new SlashCommandBuilder().setName('add').setDescription('➕ Adicionar produto')
    .addStringOption(o => o.setName('id').setDescription('ID').setRequired(true))
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
    .addNumberOption(o => o.setName('preco').setDescription('Preço').setRequired(true))
    .addStringOption(o => o.setName('conteudo').setDescription('Entrega').setRequired(true)),
  new SlashCommandBuilder().setName('config').setDescription('⚙️ Configurar')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

// ⚡ REGISTRO FORÇADO DOS COMANDOS
async function registrarComandos() {
  try {
    console.log('📝 Registrando comandos...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: comandos });
    console.log('✅ Comandos PRONTOS e FUNCIONANDO!');
  } catch (e) {
    console.error('❌ ERRO NO REGISTRO:', e);
  }
}

// 🚀 BOT ONLINE
client.once('clientReady', () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
  registrarComandos(); // <-- ELE MESMO REGISTRA QUANDO LIGA
  client.user.setActivity(`🛒 /loja`, { type: 3 });
});

// 🧩 INTERAÇÕES (TODAS AS FUNÇÕES)
client.on('interactionCreate', async i => {

  // 🛒 /LOJA
  if (i.commandName === 'loja') {
    const emb = new EmbedBuilder().setTitle(`🏪 ${NOME_LOJA}`).setColor(COR).setDescription("Escolha:");
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("📦 Ver Produtos").setCustomId("ver_produtos").setStyle(ButtonStyle.Primary)
    );
    return i.reply({ embeds: [emb], components: [btn] });
  }

  // ➕ /ADD
  if (i.commandName === 'add') {
    if (!i.member.permissions.has('Administrator')) return i.reply({content:"❌ Sem permissão", ephemeral:true});
    produtos.push({
      id: i.options.getString('id'),
      nome: i.options.getString('nome'),
      preco: i.options.getNumber('preco'),
      estoque: [i.options.getString('conteudo')]
    });
    return i.reply({content:`✅ Produto adicionado: ${i.options.getString('nome')}`, ephemeral:true});
  }

  // ⚙️ /CONFIG
  if (i.commandName === 'config') {
    if (!i.member.permissions.has('Administrator')) return;
    loja.logs = i.channel.id;
    return i.reply({content:`✅ Canal de logs definido aqui!`, ephemeral:true});
  }

  // 🔘 BOTÃO VER PRODUTOS
  if (i.isButton() && i.customId === 'ver_produtos') {
    if (produtos.length === 0) return i.reply({content:"❌ Nenhum produto cadastrado. Use /add", ephemeral:true});
    const emb = new EmbedBuilder().setTitle("📦 Nossos Produtos").setColor(COR)
      .setDescription(produtos.map((p,n) => `**${n+1}. ${p.nome}**\n💸 R$${p.preco.toFixed(2)}`).join("\n\n"));
    const btn = new ActionRowBuilder().addComponents(
      ...produtos.map((p,n) => new ButtonBuilder().setCustomId(`comprar_${p.id}`).setLabel(`Comprar #${n+1}`).setStyle(ButtonStyle.Success))
    );
    return i.reply({embeds:[emb], components:[btn], ephemeral:true});
  }

  // 💳 BOTÃO COMPRAR
  if (i.isButton() && i.customId.startsWith('comprar_')) {
    const p = produtos.find(x => x.id === i.customId.split('_')[1]);
    if (!p) return i.reply({content:"❌ Produto inválido", ephemeral:true});
    try {
      const pix = await payment.create({
        body: {
          transaction_amount: p.preco,
          description: `Compra: ${p.nome}`,
          payment_method_id: 'pix',
          payer: { email: 'cliente@loja.com' },
          external_reference: `${i.user.id}|${p.id}`
        }
      });
      const qr = pix.point_of_interaction.transaction_data;
      const emb = new EmbedBuilder().setTitle("💳 PIX").setColor("Gold")
        .setDescription(`**Valor:** R$${p.preco.toFixed(2)}\n\`\`\`${qr.qr_code}\`\`\``)
        .setImage(`data:image/png;base64,${qr.qr_code_base64}`);
      return i.reply({embeds:[emb], ephemeral:true});
    } catch (e) {
      return i.reply({content:"❌ Erro no Mercado Pago - Verifique o Token", ephemeral:true});
    }
  }

});

client.login(TOKEN);

