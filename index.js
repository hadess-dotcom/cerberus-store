const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  Routes
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const express = require('express');
const fs = require('fs');

// ==============================================
// 🔒 VARIÁVEIS SEGURAS - NÃO TEM DADOS AQUI!
// ==============================================
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// 👑 CONFIGURAÇÕES GERAIS (IGUAL GIGGLE)
const NOME_CARGO_ADM = "ADM";
const COR_LOJA = "#5865F2"; // Cor padrão igual Giggle
const NOME_LOJA = "Cerberus Store";

// ==============================================
// ⚙️ INICIALIZAÇÃO
// ==============================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const clientMp = new MercadoPagoConfig({ accessToken: MP_TOKEN });
const payment = new Payment(clientMp);
const app = express();
app.use(express.json());

// 📦 BANCO DE DADOS DA LOJA
let lojaConfig = {
  nome: NOME_LOJA,
  cor: COR_LOJA,
  canalLogs: null,
  cargoComprador: null,
  mensagemEntrega: "✅ **Obrigado pela compra!**\nAqui está o que você comprou:"
};

let produtos = [
  {
    id: "contas",
    nome: "Contas Blox Fruits",
    descricao: "Contas nível alto com frutas raras.",
    preco: 10.00,
    categoria: "contas",
    estoque: ["CONTA1 | KITSUNE", "CONTA2 | DRAGÃO"]
  },
  {
    id: "frutas",
    nome: "Frutas Permanentes",
    descricao: "Entrega automática na sua conta.",
    preco: 25.00,
    categoria: "itens",
    estoque: ["COD-FRUTA-KITSUNE", "COD-FRUTA-TREVAS"]
  }
];

let cupons = [];

// ==============================================
// 🌐 WEBHOOK DE PAGAMENTO (ENTREGA AUTOMÁTICA)
// ==============================================
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const detalhe = await payment.get({ id: data.id });
      if (detalhe.status === 'approved') {
        const usuarioId = detalhe.external_reference?.split('|')[0];
        const produtoId = detalhe.external_reference?.split('|')[1];

        const produto = produtos.find(p => p.id === produtoId);
        if (!produto || produto.estoque.length === 0) return res.sendStatus(200);

        const entrega = produto.estoque.shift();
        
        try {
          const usuario = await client.users.fetch(usuarioId);
          await usuario.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`✅ Pagamento Aprovado - ${lojaConfig.nome}`)
                .setDescription(`${lojaConfig.mensagemEntrega}\n\n\`\`\`${entrega}\`\`\`\n\n🛒 Volte sempre!`)
                .setColor('Green')
            ]
          });

          // Log no canal
          if (lojaConfig.canalLogs) {
            const canal = client.channels.cache.get(lojaConfig.canalLogs);
            canal?.send(`📥 **VENDA REALIZADA**\nUsuário: <@${usuarioId}>\nProduto: ${produto.nome}\nValor: R$ ${produto.preco.toFixed(2)}`);
          }

          // Dar cargo
          if (lojaConfig.cargoComprador) {
            const membro = client.guilds.cache.get(GUILD_ID)?.members.cache.get(usuarioId);
            membro?.roles.add(lojaConfig.cargoComprador).catch(() => {});
          }

        } catch (e) { console.log("Erro ao entregar:", e) }
      }
    }
    res.sendStatus(200);
  } catch (err) { res.sendStatus(500) }
});

app.listen(3000, () => console.log('🌐 Webhook Ativo'));

// ==============================================
// 📋 REGISTRAR COMANDOS (IGUAL GIGGLE)
// ==============================================
const commands = [
  new SlashCommandBuilder().setName('loja').setDescription('🛒 Abrir loja'),
  new SlashCommandBuilder().setName('config').setDescription('⚙️ Configurar sistema'),
  new SlashCommandBuilder().setName('add-produto').setDescription('➕ Adicionar produto'),
  new SlashCommandBuilder().setName('cupom').setDescription('🎟️ Criar cupom de desconto')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try { await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands }); }
  catch (e) { console.error(e) }
})();

// ==============================================
// 🚀 BOT ONLINE
// ==============================================
client.once('ready', () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
  client.user.setActivity(`🛒 ${lojaConfig.nome} | /loja`, { type: 3 });
});

// 🛡️ FUNÇÃO DE ADMIN
function ehAdmin(interaction) {
  return interaction.member.permissions.has('Administrator') || interaction.member.roles.cache.some(r => r.name === NOME_CARGO_ADM);
}

// ==============================================
// 🧩 INTERAÇÕES E COMANDOS
// ==============================================
client.on('interactionCreate', async interaction => {

  // 🛒 /LOJA - PAINEL PRINCIPAL IGUAL GIGGLE
  if (interaction.commandName === 'loja') {
    const embed = new EmbedBuilder()
      .setTitle(`🏪 ${lojaConfig.nome}`)
      .setColor(lojaConfig.cor)
      .setDescription("**Bem-vindo!** Escolha uma categoria abaixo para ver nossos produtos:")
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: "Sistema automático | Entrega na hora" });

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("🔑 Contas").setCustomId("cat_contas").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setLabel("📦 Itens").setCustomId("cat_itens").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setLabel("💎 Premium").setCustomId("cat_premium").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setLabel("👤 Perfil").setCustomId("perfil").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [botoes] });
  }

  // ⚙️ /CONFIG
  if (interaction.commandName === 'config') {
    if (!ehAdmin(interaction)) return interaction.reply({content:"❌ Sem permissão!", ephemeral:true});

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Configurações do Sistema")
      .setColor(lojaConfig.cor)
      .addFields(
        {name: "📌 Canal de Logs", value: lojaConfig.canalLogs ? `<#${lojaConfig.canalLogs}>` : "❌ Não definido"},
        {name: "🎖️ Cargo Comprador", value: lojaConfig.cargoComprador ? `<@&${lojaConfig.cargoComprador}>` : "❌ Não definido"},
        {name: "🎨 Cor", value: lojaConfig.cor}
      );

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("cfg_logs").setLabel("Definir Logs").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("cfg_cargo").setLabel("Definir Cargo").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({embeds:[embed], components:[botoes], ephemeral:true});
  }

  // 🔍 ABRIR CATEGORIA
  if (interaction.isButton() && interaction.customId.startsWith('cat_')) {
    const cat = interaction.customId.replace('cat_', '');
    const lista = produtos.filter(p => p.categoria === cat);

    if (lista.length === 0) return interaction.reply({content:"❌ Nenhum produto aqui ainda!", ephemeral:true});

    const embed = new EmbedBuilder()
      .setTitle(`📦 Produtos | ${cat.toUpperCase()}`)
      .setColor(lojaConfig.cor)
      .setDescription(lista.map((p,i) => `**${i+1}. ${p.nome}**\n> ${p.descricao}\n💸 **R$ ${p.preco.toFixed(2)}** | 📦 Estoque: ${p.estoque.length}\n`).join("\n\n"));

    const botoes = new ActionRowBuilder().addComponents(
      ...lista.map((p,i) => new ButtonBuilder().setCustomId(`comprar_${p.id}`).setLabel(`Comprar #${i+1}`).setStyle(ButtonStyle.Success))
    );

    await interaction.reply({embeds:[embed], components:[botoes], ephemeral:true});
  }

  // 💳 BOTÃO DE COMPRAR
  if (interaction.isButton() && interaction.customId.startsWith('comprar_')) {
    const prodId = interaction.customId.replace('comprar_', '');
    const produto = produtos.find(p => p.id === prodId);
    if (!produto) return interaction.reply({content:"❌ Produto inválido", ephemeral:true});

    // GERAR PIX
    const pagamento = await payment.create({
      body: {
        transaction_amount: produto.preco,
        description: `Compra: ${produto.nome}`,
        payment_method_id: 'pix',
        payer: { email: 'cliente@loja.com' },
        external_reference: `${interaction.user.id}|${produto.id}`
      }
    });

    const qr = pagamento.point_of_interaction.transaction_data;

    const embedPix = new EmbedBuilder()
      .setTitle("💳 Pagamento PIX")
      .setColor("Gold")
      .setDescription(`**Produto:** ${produto.nome}\n**Valor:** R$ ${produto.preco.toFixed(2)}\n\n📱 **Código:**\n\`\`\`${qr.qr_code}\`\`\``)
      .setImage(`data:image/png;base64,${qr.qr_code_base64}`);

    const btnLink = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("🔗 Pagar Agora").setURL(qr.ticket_url).setStyle(ButtonStyle.Link));

    await interaction.reply({embeds:[embedPix], components:[btnLink], ephemeral:true});
  }

  // ⚙️ CONFIG - DEFINIR CANAL
  if (interaction.isButton() && interaction.customId === 'cfg_logs') {
    if (!ehAdmin(interaction)) return;
    lojaConfig.canalLogs = interaction.channel.id;
    await interaction.reply({content:`✅ Canal de logs definido aqui: <#${interaction.channel.id}>`, ephemeral:true});
  }

  if (interaction.isButton() && interaction.customId === 'cfg_cargo') {
    if (!ehAdmin(interaction)) return;
    lojaConfig.cargoComprador = interaction.guild.roles.cache.find(r => r.name.includes("Comprador"))?.id || null;
    await interaction.reply({content:`✅ Cargo definido: <@&${lojaConfig.cargoComprador}>`, ephemeral:true});
  }

});

client.login(TOKEN);

