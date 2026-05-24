const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const express = require('express');
const fs = require('fs');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;


// 👑 CONFIGURAÇÃO DO CARGO DE ADMINISTRADOR
// COLOQUE AQUI O NOME EXATO DO CARGO QUE VOCÊ USA DE ADM
const NOME_CARGO_ADM = "ADM"; // Ex: "ADM", "Moderador", "Equipe", "Dono"

// ✅ Configurações
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

// 📦 LOJA COMPLETA - VÁRIOS PRODUTOS
let loja = {
  nome: "Cerberus Store",
  produtos: [
    {
      id: "contas",
      nome: "Contas Blox Fruits",
      descricao: "Contas aleatórias nível alto com frutas míticas/lendárias.",
      preco: 10.00,
      estoque: [
        "CONTA1 | NÍVEL MAX | KITSUNE",
        "CONTA2 | NÍVEL 1500 | LEOPARDO",
        "CONTA3 | NÍVEL MAX | DRAGÃO"
      ]
    },
    {
      id: "frutas",
      nome: "Frutas Permanentes",
      descricao: "Frutas do jogo na sua conta, 100% seguro.",
      preco: 25.00,
      estoque: [
        "CODIGO-FRUTA-KITSUNE",
        "CODIGO-FRUTA-DRAGAO",
        "CODIGO-FRUTA-TREVAS"
      ]
    }
  ]
};

// 📩 WEBHOOK - ENTREGA AUTOMÁTICA
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const detalhe = await payment.get({ id: data.id });
      if (detalhe.status === 'approved') {
        const usuarioId = detalhe.external_reference?.split('|')[0];
        const produtoId = detalhe.external_reference?.split('|')[1];

        const produto = loja.produtos.find(p => p.id === produtoId);
        if (!produto || produto.estoque.length === 0) return res.sendStatus(200);

        const entrega = produto.estoque.shift();
        try {
          const usuario = await client.users.fetch(usuarioId);
          await usuario.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`✅ Pagamento Aprovado - ${loja.nome}`)
                .setDescription(`**Produto:** ${produto.nome}\n\n**🔑 Dados:**\n\`\`\`${entrega}\`\`\`\n\n⚠️ Aproveite!`)
                .setColor('Green')
            ]
          });
          console.log(`📦 Entregue para ${usuario.tag} | Produto: ${produto.nome}`);
        } catch (e) { console.log("Erro ao enviar DM:", e) }
      }
    }
    res.sendStatus(200);
  } catch (err) { res.sendStatus(500) }
});

app.listen(3000, () => console.log('🌐 Webhook Ativo'));

// ✅ COMANDOS
const commands = [
  new SlashCommandBuilder().setName('loja').setDescription('Abrir a Cerberus Store')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try { await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands }); }
  catch (e) { console.error(e) }
})();

// ✅ BOT ONLINE
client.once('ready', () => console.log(`✅ Bot Online: ${client.user.tag}`));

// 🛑 FUNÇÃO: VERIFICA SE TEM O CARGO DE ADMIN
function ehAdmin(interaction) {
  // Verifica se a pessoa tem permissão de Administrador OU tem o cargo com o nome que você definiu
  return interaction.member.permissions.has('Administrator') || interaction.member.roles.cache.some(role => role.name === NOME_CARGO_ADM);
}

// ✅ INTERAÇÕES
client.on('interactionCreate', async interaction => {

  // ➡️ /LOJA
  if (interaction.commandName === 'loja') {
    const embed = new EmbedBuilder()
      .setTitle(`🛒 ${loja.nome}`)
      .setDescription("Escolha uma categoria de produto abaixo:")
      .setColor('Purple');

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🛍️ Ver Produtos').setCustomId('ver_produtos').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setLabel('⚙️ Painel Admin').setCustomId('painel_admin').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [botoes] });
  }

  // ➡️ VER PRODUTOS
  if (interaction.isButton() && interaction.customId === 'ver_produtos') {
    const opcoes = loja.produtos.map(p => ({
      label: p.nome,
      description: `R$ ${p.preco.toFixed(2)} | Estoque: ${p.estoque.length}`,
      value: p.id
    }));

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('escolher_produto').setPlaceholder('Selecione um produto...').addOptions(opcoes)
    );

    await interaction.reply({ content: "📋 **Lista de Produtos:**", components: [menu], ephemeral: true });
  }

  // ➡️ ESCOLHEU UM PRODUTO NO MENU
  if (interaction.isStringSelectMenu() && interaction.customId === 'escolher_produto') {
    const produto = loja.produtos.find(p => p.id === interaction.values[0]);
    if (!produto) return;

    const embed = new EmbedBuilder()
      .setTitle(`🛒 ${produto.nome}`)
      .setDescription(`${produto.descricao}\n\n💸 **Preço:** R$ ${produto.preco.toFixed(2)}\n📦 **Em estoque:** ${produto.estoque.length} unidades`)
      .setColor('Purple');

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('💳 Comprar Agora').setCustomId(`comprar_${produto.id}`).setStyle(ButtonStyle.Success)
    );

    await interaction.update({ embeds: [embed], components: [botoes] });
  }

  // ➡️ BOTÃO COMPRAR
  if (interaction.isButton() && interaction.customId.startsWith('comprar_')) {
    const produtoId = interaction.customId.replace('comprar_', '');
    const produto = loja.produtos.find(p => p.id === produtoId);

    if (!produto) return;
    if (produto.estoque.length <= 0) return interaction.reply({ content: "❌ **ESTOQUE ESGOTADO!**", ephemeral: true });

    // GERAR PAGAMENTO
    const pagamento = await payment.create({
      body: {
        transaction_amount: produto.preco,
        description: `Compra: ${produto.nome}`,
        payment_method_id: 'pix',
        payer: { email: 'cliente@loja.com' },
        external_reference: `${interaction.user.id}|${produtoId}`
      }
    });

    const qr = pagamento.point_of_interaction.transaction_data.qr_code;
    const link = pagamento.point_of_interaction.transaction_data.ticket_url;

    const embed = new EmbedBuilder()
      .setTitle('💳 Pagamento PIX')
      .setDescription(`**Produto:** ${produto.nome}\n**Valor:** R$ ${produto.preco.toFixed(2)}\n\n📱 **Código PIX:**\n\`\`\`${qr}\`\`\``)
      .setColor('Gold');

    const botaoLink = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('🔗 Pagar Agora').setURL(link).setStyle(ButtonStyle.Link));
    await interaction.reply({ embeds: [embed], components: [botaoLink], ephemeral: true });
  }

  // ➡️ PAINEL ADMIN
  if (interaction.isButton() && interaction.customId === 'painel_admin') {
    if (!ehAdmin(interaction)) return interaction.reply({ content: "❌ Apenas Administradores têm acesso.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('⚙️ PAINEL ADMIN')
      .setDescription(`Loja: ${loja.nome}\nTotal de categorias: ${loja.produtos.length}`)
      .setColor('Red');

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('📦 Adicionar Estoque').setCustomId('add_estoque').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setLabel('🏷️ Novo Produto').setCustomId('novo_produto').setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [botoes], ephemeral: true });
  }

  // ➡️ ADICIONAR ESTOQUE
  if (interaction.isButton() && interaction.customId === 'add_estoque') {
    if (!ehAdmin(interaction)) return;
    const opcoes = loja.produtos.map(p => ({ label: p.nome, value: p.id }));
    const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('add_estoque_produto').setPlaceholder('Escolha o produto...').addOptions(opcoes));
    await interaction.reply({ content: "Qual produto quer adicionar estoque?", components: [menu], ephemeral: true });
  }

  // ➡️ ESCOLHEU PRODUTO PARA ADICIONAR ESTOQUE
  if (interaction.isStringSelectMenu() && interaction.customId === 'add_estoque_produto') {
    if (!ehAdmin(interaction)) return;
    const produtoId = interaction.values[0];
    const modal = new ModalBuilder().setCustomId(`modal_add_${produtoId}`).setTitle('Adicionar Estoque');
    const input = new TextInputBuilder().setCustomId('itens').setLabel('Cole os itens (um por linha)').setStyle(TextInputStyle.Paragraph).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }

  // ➡️ RECEBEU ESTOQUE
  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_add_')) {
    if (!ehAdmin(interaction)) return;
    const produtoId = interaction.customId.replace('modal_add_', '');
    const produto = loja.produtos.find(p => p.id === produtoId);
    const itens = interaction.fields.getTextInputValue('itens').split('\n').filter(i => i.trim() !== "");
    produto.estoque.push(...itens);
    await interaction.reply({ content: `✅ Adicionado! **${itens.length}** itens em ${produto.nome}. Estoque: ${produto.estoque.length}`, ephemeral: true });
  }

  // ➡️ CRIAR NOVO PRODUTO
  if (interaction.isButton() && interaction.customId === 'novo_produto') {
    if (!ehAdmin(interaction)) return;
    const modal = new ModalBuilder().setCustomId('modal_novo_produto').setTitle('Criar Novo Produto');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('ID Único (sem espaço)').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome do Produto').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('preco').setLabel('Preço (ex: 15.50)').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição').setStyle(TextInputStyle.Paragraph).setRequired(true))
    );
    await interaction.showModal(modal);
  }

  // ➡️ SALVAR NOVO PRODUTO
  if (interaction.isModalSubmit() && interaction.customId === 'modal_novo_produto') {
    if (!ehAdmin(interaction)) return;
    loja.produtos.push({
      id: interaction.fields.getTextInputValue('id'),
      nome: interaction.fields.getTextInputValue('nome'),
      preco: parseFloat(interaction.fields.getTextInputValue('preco')),
      descricao: interaction.fields.getTextInputValue('desc'),
      estoque: []
    });
    await interaction.reply({ content: `✅ Produto **${interaction.fields.getTextInputValue('nome')}** criado com sucesso!`, ephemeral: true });
  }

});

client.login(TOKEN);

