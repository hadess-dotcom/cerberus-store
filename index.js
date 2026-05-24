
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

// 🔒 VARIÁVEIS DO RAILWAY (SEGURO, SEM DADOS AQUI)
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// ⚙️ CONFIGURAÇÕES GERAIS
const COR_LOJA = "#5865F2";
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

const clientMp = new MercadoPagoConfig({ accessToken: MP_TOKEN });
const payment = new Payment(clientMp);
const app = express();
app.use(express.json());

// 📦 BANCO DE DADOS
let lojaConfig = {
  nome: NOME_LOJA,
  cor: COR_LOJA,
  canalLogs: null,
  cargoComprador: null,
  mensagemEntrega: "✅ **Obrigado pela compra!**\nAqui está o que você comprou:"
};

let produtos = [];
let cupons = [];

// 🌐 WEBHOOK DE PAGAMENTO
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const detalhe = await payment.get({ id: data.id });
      if (detalhe.status === 'approved') {
        const usuarioId = detalhe.external_reference?.split('|')[0];
        const produtoId = detalhe.external_reference?.split('|')[1];
        const produto = produtos.find(p => p.id === produtoId);

        if (produto && produto.estoque.length > 0) {
          const entrega = produto.estoque.shift();
          try {
            const usuario = await client.users.fetch(usuarioId);
            await usuario.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`✅ Pagamento Aprovado - ${lojaConfig.nome}`)
                  .setDescription(`${lojaConfig.mensagemEntrega}\n\n\`\`\`${entrega}\`\`\``)
                  .setColor('Green')
              ]
            });

            if (lojaConfig.canalLogs) {
              client.channels.cache.get(lojaConfig.canalLogs)?.send(`📥 **VENDA** | Usuário: <@${usuarioId}> | Produto: ${produto.nome} | R$ ${produto.preco.toFixed(2)}`);
            }
            if (lojaConfig.cargoComprador) {
              client.guilds.cache.get(GUILD_ID)?.members.cache.get(usuarioId)?.roles.add(lojaConfig.cargoComprador);
            }
          } catch (e) {}
        }
      }
    }
    res.sendStatus(200);
  } catch (err) { res.sendStatus(500) }
});

app.listen(3000, () => console.log('🌐 Webhook Ativo'));

// 📋 REGISTRAR COMANDOS (CORRIGIDO)
const commands = [
  new SlashCommandBuilder().setName('loja').setDescription('🛒 Abrir painel da loja'),
  new SlashCommandBuilder().setName('config').setDescription('⚙️ Configurar sistema'),
  new SlashCommandBuilder().setName('add-produto').setDescription('➕ Adicionar produto')
    .addStringOption(o => o.setName('id').setDescription('ID único').setRequired(true))
    .addStringOption(o => o.setName('nome').setDescription('Nome').setRequired(true))
    .addNumberOption(o => o.setName('preco').setDescription('Preço R$').setRequired(true))
    .addStringOption(o => o.setName('descricao').setDescription('Descrição').setRequired(true))
    .addStringOption(o => o.setName('conteudo').setDescription('O que entregar').setRequired(true))
    .addStringOption(o => o.setName('categoria').setDescription('Categoria').setRequired(true)),
  new SlashCommandBuilder().setName('cupom').setDescription('🎟️ Criar cupom')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('📝 Registrando comandos...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Comandos registrados!');
  } catch (e) { console.error('❌ Erro comandos:', e) }
})();

// 🚀 BOT ONLINE (SEM AVISO MAIS)
client.once('clientReady', () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
  client.user.setActivity(`🛒 ${lojaConfig.nome} | /loja`, { type: 3 });
});

// 🛡️ ADMIN
function ehAdmin(interaction) {
  return interaction.member.permissions.has('Administrator');
}

// 🧩 INTERAÇÕES
client.on('interactionCreate', async interaction => {

  // 🛒 /LOJA
  if (interaction.commandName === 'loja') {
    const embed = new EmbedBuilder()
      .setTitle(`🏪 ${lojaConfig.nome}`)
      .setColor(lojaConfig.cor)
      .setDescription("**Bem-vindo!** Escolha uma categoria:")
      .setThumbnail(client.user.displayAvatarURL());

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("🔑 Contas").setCustomId("cat_contas").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setLabel("📦 Itens").setCustomId("cat_itens").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setLabel("💎 Premium").setCustomId("cat_premium").setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [botoes] });
  }

  // ➕ /ADD-PRODUTO
  if (interaction.commandName === 'add-produto') {
    if (!ehAdmin(interaction)) return interaction.reply({content:"❌ Sem permissão!", ephemeral:true});

    const prod = {
      id: interaction.options.getString('id'),
      nome: interaction.options.getString('nome'),
      preco: interaction.options.getNumber('preco'),
      descricao: interaction.options.getString('descricao'),
      conteudo: interaction.options.getString('conteudo'),
      categoria: interaction.options.getString('categoria'),
      estoque: [interaction.options.getString('conteudo')]
    };

    produtos.push(prod);
    await interaction.reply({content:`✅ Produto adicionado:\n**${prod.nome}** | R$ ${prod.preco.toFixed(2)}`, ephemeral:true});
  }

  // ⚙️ /CONFIG
  if (interaction.commandName === 'config') {
    if (!ehAdmin(interaction)) return;

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Configurações")
      .setColor(lojaConfig.cor)
      .addFields(
        {name: "📌 Canal Logs", value: lojaConfig.canalLogs ? `<#${lojaConfig.canalLogs}>` : "❌ Não definido"},
        {name: "🎖️ Cargo Comprador", value: lojaConfig.cargoComprador ? `<@&${lojaConfig.cargoComprador}>` : "❌ Não definido"}
      );

    await interaction.reply({embeds:[embed], ephemeral:true});
  }

  // 🔍 ABRIR CATEGORIA
  if (interaction.isButton() && interaction.customId.startsWith('cat_')) {
    const cat = interaction.customId.split('_')[1];
    const lista = produtos.filter(p => p.categoria === cat);

    if (lista.length === 0) return interaction.reply({content:"❌ Nenhum produto aqui!", ephemeral:true});

    const embed = new EmbedBuilder()
      .setTitle(`📦 ${cat.toUpperCase()}`)
      .setColor(lojaConfig.cor)
      .setDescription(lista.map((p,i) => `**${i+1}. ${p.nome}**\n💸 R$ ${p.preco.toFixed(2)}`).join("\n\n"));

    const botoes = new ActionRowBuilder().addComponents(
      ...lista.map((p,i) => new ButtonBuilder().setCustomId(`comprar_${p.id}`).setLabel(`Comprar #${i+1}`).setStyle(ButtonStyle.Success))
    );

    await interaction.reply({embeds:[embed], components:[botoes], ephemeral:true});
  }

  // 💳 COMPRAR
  if (interaction.isButton() && interaction.customId.startsWith('comprar_')) {
    const prod = produtos.find(p => p.id === interaction.customId.split('_')[1]);
    if (!prod) return interaction.reply({content:"❌ Produto inválido", ephemeral:true});

    try {
      const pagamento = await payment.create({
        body: {
          transaction_amount: prod.preco,
          description: `Compra: ${prod.nome}`,
          payment_method_id: 'pix',
          payer: { email: 'cliente@loja.com' },
          external_reference: `${interaction.user.id}|${prod.id}`
        }
      });

      const qr = pagamento.point_of_interaction.transaction_data;

      const embedPix = new EmbedBuilder()
        .setTitle("💳 Pagamento PIX")
        .setColor("Gold")
        .setDescription(`**Produto:** ${prod.nome}\n**Valor:** R$ ${prod.preco.toFixed(2)}\n\n\`\`\`${qr.qr_code}\`\`\``)
        .setImage(`data:image/png;base64,${qr.qr_code_base64}`);

      await interaction.reply({embeds:[embedPix], ephemeral:true});

    } catch (e) {
      await interaction.reply({content:"❌ Erro: Verifique o Token do Mercado Pago", ephemeral:true});
    }
  }

});

client.login(TOKEN);
