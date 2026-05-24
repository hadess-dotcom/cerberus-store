require('dotenv').config()

const {
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js')

const commands = [

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Veja o ping do bot')

].map(command => command.toJSON())

const rest = new REST({ version: '10' })
.setToken(process.env.DISCORD_BOT_TOKEN)

async function deployCommands() {

  try {

    console.log('🔄 Registrando comandos...')

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    )

    console.log('✅ Comandos registrados')

  } catch(err) {

    console.log(err)

  }

}

deployCommands()
