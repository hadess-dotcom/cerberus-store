const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const { MercadoPagoConfig } = require('mercadopago');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// TESTAR SE AS VARIÁVEIS ESTÃO VINDO
console.log("TOKEN:", TOKEN);
console.log("CLIENT_ID:", CLIENT_ID);
console.log("GUILD_ID:", GUILD_ID);
console.log("MP_TOKEN:", MP_TOKEN);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Mercado Pago
const clientMp = new MercadoPagoConfig({
  accessToken: MP_TOKEN
});

// Comandos
const commands = [
  new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Comprar conta')
].map(command => command.toJSON());

// Registrar comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();

// Bot online
client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

// Interações
client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'comprar') {

    const embed = new EmbedBuilder()
      .setTitle('Cerberus Store')
      .setDescription('Pagamento automático em breve.')
      .setColor('Purple');

    await interaction.reply({
      embeds: [embed]
    });

  }

});

// Login
client.login(TOKEN);
