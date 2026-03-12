const { readJson, writeJson } = require('./helpers');
const { EmbedBuilder } = require('discord.js');

function calculateOverview() {
  const members = readJson('data/members.json', []);
  const transactions = readJson('data/transactions.json', []);
  const config = readJson('data/config.json', {});

  const activeMembers = members.filter(member => member.active);

  const totalIncome = transactions
    .filter(tx => tx.type === 'income' && tx.status === 'bezahlt')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalIncome - totalExpenses;

  const openYearlyFees = activeMembers.filter(member => {
    return !transactions.some(tx =>
      tx.userId === member.userId &&
      tx.reason === 'jahresbeitrag' &&
      tx.status === 'bezahlt'
    );
  }).length;

  const openFines = transactions.filter(tx =>
    tx.reason === 'strafe' && tx.status === 'offen'
  ).length;

  const totalFines = transactions
    .filter(tx => tx.reason === 'strafe' && tx.status === 'bezahlt')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    yearlyFee: config.yearlyFee ?? 12,
    activeMembers: activeMembers.length,
    totalIncome,
    totalExpenses,
    balance,
    openYearlyFees,
    openFines,
    totalFines
  };
}

async function updateOverview(client) {
  const config = readJson('data/config.json', {});
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

  let message = null;

  if (config.overviewMessageId) {
    try {
      message = await channel.messages.fetch(config.overviewMessageId);
      await message.edit({ embeds: [embed] });
      return;
    } catch (error) {
      console.log('Übersichts-Nachricht nicht gefunden, erstelle neue.');
    }
  }

  message = await channel.send({ embeds: [embed] });

  config.overviewMessageId = message.id;
  writeJson('data/config.json', config);
}

module.exports = {
  calculateOverview,
  updateOverview
};