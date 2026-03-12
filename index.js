require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const {
  Client,
  GatewayIntentBits,
  Collection
} = require('discord.js');

const { updateOverview } = require('./utils/overview');
const { sendReminder } = require('./utils/reminder');
const { updateSupportersMessage } = require('./utils/supporters');
const {
  addOrReactivateMember,
  deactivateMember,
  syncMembersByRole
} = require('./utils/members');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Command geladen: ${command.data.name}`);
    } else {
      console.log(`⚠️ Command-Datei ${file} ist unvollständig.`);
    }
  }
} else {
  console.log('⚠️ Kein commands-Ordner gefunden.');
}

client.once('clientReady', async () => {
  try {
    console.log(`✅ ${client.user.tag} ist online!`);

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.members.fetch();

    syncMembersByRole(guild, process.env.LOCO_ROLE_ID);
    console.log('🔄 Mitglieder mit Loco Squad Rolle wurden synchronisiert.');

    await updateOverview(client);
await updateSupportersMessage(client);
    cron.schedule(
      '0 12 * * 0',
      async () => {
        try {
          console.log('🔔 Starte automatischen Sonntags-Reminder...');
          await sendReminder(client);
        } catch (error) {
          console.error('Fehler beim automatischen Reminder:', error);
        }
      },
      {
        timezone: 'Europe/Berlin'
      }
    );

    console.log('✅ Automatischer Reminder ist aktiv. Jeden Sonntag um 12:00 Uhr (Europe/Berlin).');
  } catch (error) {
    console.error('Fehler beim Ready-Start:', error);
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const locoRoleId = process.env.LOCO_ROLE_ID;

    const hadRole = oldMember.roles.cache.has(locoRoleId);
    const hasRole = newMember.roles.cache.has(locoRoleId);

    console.log(
      `🔍 Rollenupdate bei ${newMember.user.username}: hadRole=${hadRole}, hasRole=${hasRole}`
    );

    if (!hadRole && hasRole) {
      addOrReactivateMember(newMember.user);
      console.log(`➕ Mitglied hinzugefügt/reaktiviert: ${newMember.user.username}`);
      await updateOverview(client);
await updateSupportersMessage(client);
    }

    if (hadRole && !hasRole) {
      deactivateMember(newMember.user.id);
      console.log(`➖ Mitglied deaktiviert: ${newMember.user.username}`);
      await updateOverview(client);
await updateSupportersMessage(client);
    }
  } catch (error) {
    console.error('Fehler bei guildMemberUpdate:', error);
  }
});

client.on('guildMemberRemove', async member => {
  try {
    deactivateMember(member.user.id);
    console.log(`🚪 Mitglied hat den Server verlassen: ${member.user.username}`);
    await updateOverview(client);
await updateSupportersMessage(client);
  } catch (error) {
    console.error('Fehler bei guildMemberRemove:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.log(`⚠️ Kein Command gefunden für: ${interaction.commandName}`);
    return;
  }

  const adminChannelId = process.env.GANGBANK_ADMIN_CHANNEL_ID;

  if (interaction.channelId !== adminChannelId) {
    return interaction.reply({
      content: '❌ Diese GangBank-Befehle können nur im Admin-Channel genutzt werden.',
      ephemeral: true
    });
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Fehler beim Ausführen von /${interaction.commandName}:`, error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: '❌ Beim Ausführen des Befehls ist ein Fehler aufgetreten.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Beim Ausführen des Befehls ist ein Fehler aufgetreten.',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);