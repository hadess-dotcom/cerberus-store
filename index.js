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
const { MercadoPagoConfig, Payment } = require('mercadopago');
const axios = require('axios');

// 🔒 SUas VARIÁVEIS DE AMBIENTE
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const MP_CLIENT_ID = process.env.MP_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET;

// 📦 AQUI OS PRODUTOS FICAM SALVOS PARA SEMPRE (ENQUANTO O BOT RODAR)
let produtos = [];
let mpDados = { access_token: null, refresh_token: null, expires: null };

// 🚀 INICIALIZAÇÃO
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const express = require('express');
const app = express();
app.use(express.json());

// 🔄 PEGA TOKEN DO MERCADO PAGO
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
      return mpDados.access_token;
    } catch { return null; }
  }
  return null;
}

// 🔗 ROTA DE CONEXÃO COM MP
app.get('/conectar', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send('Erro');
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
    res.send('✅ Conectado ao Mercado Pago!');
  } catch { res.send('❌ Erro ao conectar'); }
});

// 📩 WEBHOOK DE PAGAMENTO (ENTREGA O PRODUTO)
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment') return res.sendStatus(200);
    const token = await pegarTokenValido();
    if (!token) return res.sendStatus(401);

    const mp = new MercadoPagoConfig({ accessToken: token });
    const pagamento = await new Payment(mp).get({ id: data.id });

    if (pagamento.status === 'approved') {
      const [usuarioId, produtoId] = pagamento.external_reference.split('|');
      const produto = produtos.find(p => p.id === produtoId);
      if (!produto) return res.sendStatus(200);

      // Entrega o produto
      try {
        const usuario = await client.users.fetch(usuarioId);
        await usuario.send({
          embeds: [new EmbedBuilder()
            .setTitle('✅ PAGAMENTO APROVADO!')
            .setDescription(`**Produto:** ${produto.nome}\n\n**Conteúdo:**\n\`\`\`${produto.conteudo}\`\`\`\n\nObrigado pela compra!`)
            .setColor('#2ECC71')]
        });
      } catch {}
    }
    res.sendStatus(200);
  } catch { res.sendStatus(500); }
});

app.listen(3000, () => console.log('✅ Sistema Online'));

// 📋 COMANDOS
const comandos = [
  new SlashCommandBuilder()
    .setName('conectar-mp')
    .setDescription('[ADM] Conectar conta Mercado Pago'),

  new SlashCommandBuilder()
    .setName('add-produto')
    .setDescription('[ADM] Adiciona produto que fica salvo')
    .addChannelOption(opt => opt.setName('canal').setRequired(true))
    .addStringOption(opt => opt.setName('nome').setRequired(true))
    .addNumberOption(opt => opt.setName('preco').setRequired(true))
    .addStringOption(opt => opt.setName('conteudo').setRequired(true).setDescription('O que vai ser entregue'))
    .addStringOption(opt => opt.setName('descricao').setRequired(false)),

  new SlashCommandBuilder()
    .setName('meus-produtos')
    .setDescription('Ver todos produtos salvos')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registrarComandos() {
  try { await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: comandos }); }
  catch (e) { console.error(e); }
}

// ✅ BOT PRONTO
client.once('ready', () => {
  console.log('✅ Bot Online | Produtos Salvos | MP Ativo');
  registrarComandos();
});

function ehAdmin(i) {
  return i.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

// 🧩 AÇÕES
client.on('interactionCreate', async i => {

  // 🔗 CONECTAR MP
  if (i.commandName === 'conectar-mp') {
    if (!ehAdmin(i)) return i.reply({ content: '❌ Sem permissão', ephemeral: true });
    const link = `https://auth.mercadopago.com.br/authorization?client_id=${MP_CLIENT_ID}&response_type=code&redirect_uri=${WEBHOOK_URL}/conectar&scope=read%20write%20offline_access`;
    return i.reply({ content: `🔗 Clique aqui para conectar:\n${link}`, ephemeral: true });
  }

  // ➕ ADICIONA E SALVA PRODUTO
  if (i.commandName === 'add-produto') {
    if (!ehAdmin(i)) return i.reply({ content: '❌ Sem permissão', ephemeral: true });

    const canal = i.options.getChannel('canal');
    const nome = i.options.getString('nome');
    const preco = i.options.getNumber('preco');
    const conteudo = i.options.getString('conteudo');
    const descricao = i.options.getString('descricao') || 'Sem descrição';

    // SALVA AQUI — NÃO SOME MAIS
    const produto = {
      id: Math.random().toString(36).substr(2, 8),
      nome, preco, conteudo, descricao
    };
    produtos.push(produto);

    // MOSTRA PRODUTO NO CANAL
    const embed = new EmbedBuilder()
      .setTitle(`🛒 ${produto.nome}`)
      .setDescription(produto.descricao)
      .addFields(
        { name: '💸 Preço', value: `R$ ${produto.preco.toFixed(2)}`, inline: true }
      )
      .setColor('#2B0B47');

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('💳 Comprar').setStyle(ButtonStyle.Success).setCustomId(`comprar_${produto.id}`)
    );

    await canal.send({ embeds: [embed], components: [botoes] });
    return i.reply({ content: `✅ Produto **${nome}** salvo e criado!`, ephemeral: true });
  }

  // 📋 VER PRODUTOS SALVOS
  if (i.commandName === 'meus-produtos') {
    if (produtos.length === 0) return i.reply({ content: '📭 Nenhum produto salvo', ephemeral: true });
    const lista = produtos.map((p, n) => `${n+1}. ${p.nome} | R$ ${p.preco.toFixed(2)}`).join('\n');
    return i.reply({ content: `📦 **Produtos Salvos:**\n${lista}`, ephemeral: true });
  }

  // 💳 GERAR PAGAMENTO PIX
  if (i.isButton() && i.customId.startsWith('comprar_')) {
    const produto = produtos.find(p => p.id === i.customId.split('_')[1]);
    if (!produto) return i.reply({ content: '❌ Produto não encontrado', ephemeral: true });

    const token = await pegarTokenValido();
    if (!token) return i.reply({ content: '❌ Conecte o Mercado Pago com /conectar-mp', ephemeral: true });

    try {
      const mp = new MercadoPagoConfig({ accessToken: token });
      const pagamento = await new Payment(mp).create({
        body: {
          transaction_amount: produto.preco,
          description: `Compra: ${produto.nome}`,
          payment_method_id: 'pix',
          payer: { email: `user_${i.user.id}@loja.com` },
          external_reference: `${i.user.id}|${produto.id}`,
          notification_url: `${WEBHOOK_URL}/webhook`
        }
      });

      const qr = pagamento.point_of_interaction.transaction_data;

      return i.reply({
        embeds: [new EmbedBuilder()
          .setTitle('💳 PAGAMENTO PIX')
          .setDescription(`**Produto:** ${produto.nome}\n**Valor:** R$ ${produto.preco.toFixed(2)}\n\n\`\`\`${qr.qr_code}\`\`\``)
          .setImage(`data:image/png;base64,${qr.qr_code_base64}`)
          .setColor('#7B2CBF')],
        ephemeral: true
      });

    } catch {
      return i.reply({ content: '❌ Erro ao gerar pagamento', ephemeral: true });
    }
  }

});

client.login(TOKEN);

