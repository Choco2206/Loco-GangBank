require('dotenv').config();
const {
  Client,
  GatewayIntentBits
} = require('discord.js');

const { updateOverview } = require('./utils/overview');
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

client.once('clientReady', async () => {
  try {
    console.log(`✅ ${client.user.tag} ist online!`);

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.members.fetch();

    syncMembersByRole(guild, process.env.LOCO_ROLE_ID);
    console.log('🔄 Mitglieder mit Loco Squad Rolle wurden synchronisiert.');

    await updateOverview(client);
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
    }

    if (hadRole && !hasRole) {
      deactivateMember(newMember.user.id);
      console.log(`➖ Mitglied deaktiviert: ${newMember.user.username}`);
      await updateOverview(client);
    }
  } catch (error) {
    console.error('Fehler bei guildMemberUpdate:', error);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    deactivateMember(member.user.id);
    console.log(`🚪 Mitglied hat den Server verlassen: ${member.user.username}`);
    await updateOverview(client);
  } catch (error) {
    console.error('Fehler bei guildMemberRemove:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);