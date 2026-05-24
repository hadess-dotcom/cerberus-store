const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  EmbedBuilder
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const mercadopago = require('mercadopago');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

mercadopago.configure({
  access_token: MP_TOKEN
});

const commands = [
  new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Comprar conta')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Comandos registrados');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

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

client.login(TOKEN);
