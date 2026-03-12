require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
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

async function postOverview() {
  try {
    const channel = await client.channels.fetch(process.env.GANGBANK_OVERVIEW_CHANNEL_ID);
    if (!channel) return;

    const overview = calculateOverview();

    const embed = new EmbedBuilder()
      .setTitle('🐺 LOCO GANGBANK')
      .setDescription('Aktuelle Übersicht der Mannschaftskasse')
      .addFields(
        { name: 'Kontostand', value: `${overview.balance} €`, inline: true },
        { name: 'Aktive Mitglieder', value: `${overview.activeMembers}`, inline: true },
        { name: 'Jahresbeitrag', value: `${overview.yearlyFee} €`, inline: true },
        { name: 'Offene Jahresbeiträge', value: `${overview.openYearlyFees}`, inline: true },
        { name: 'Offene Strafen', value: `${overview.openFines}`, inline: true },
        { name: 'Strafen bezahlt', value: `${overview.totalFines} €`, inline: true },
        { name: 'Einnahmen gesamt', value: `${overview.totalIncome} €`, inline: true },
        { name: 'Ausgaben gesamt', value: `${overview.totalExpenses} €`, inline: true }
      )
      .setFooter({ text: 'Loco GangBank' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Posten der Übersicht:', error);
  }
}

client.once('ready', async () => {
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

    if (!hadRole && hasRole) {
      addOrReactivateMember(newMember.user);
      console.log(`➕ Mitglied hinzugefügt/reaktiviert: ${newMember.user.username}`);
      await postOverview();
    }

    if (hadRole && !hasRole) {
      deactivateMember(newMember.user.id);
      console.log(`➖ Mitglied deaktiviert: ${newMember.user.username}`);
      await postOverview();
    }
  } catch (error) {
    console.error('Fehler bei guildMemberUpdate:', error);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    deactivateMember(member.user.id);
    console.log(`🚪 Mitglied hat den Server verlassen: ${member.user.username}`);
    await postOverview();
  } catch (error) {
    console.error('Fehler bei guildMemberRemove:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);