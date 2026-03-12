require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { calculateOverview } = require('./utils/overview');

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
  console.log(`✅ ${client.user.tag} ist online!`);
  await postOverview();
});

client.login(process.env.DISCORD_TOKEN);