const { readJson, writeJson } = require('./helpers');
const { EmbedBuilder } = require('discord.js');
const { getCurrentYear, getTransactionYear } = require('./year');

function calculateTopSupporters() {
  const transactions = readJson('data/transactions.json', []);
  const config = readJson('data/config.json', {});
  const currentYear = getCurrentYear();

  const yearTransactions = transactions.filter(
    tx =>
      getTransactionYear(tx, currentYear) === currentYear &&
      tx.reason === 'sonderzahlung' &&
      tx.status === 'bezahlt' &&
      tx.userId
  );

  const supporterMap = new Map();

  yearTransactions.forEach(tx => {
    if (!supporterMap.has(tx.userId)) {
      supporterMap.set(tx.userId, {
        userId: tx.userId,
        name: tx.name,
        total: 0
      });
    }

    const entry = supporterMap.get(tx.userId);
    entry.total += tx.amount;
  });

  const supporters = Array.from(supporterMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return {
    currentYear,
    supporters
  };
}

async function updateSupportersMessage(client) {
  const config = readJson('data/config.json', {});
  const currentYear = getCurrentYear();
  const channel = await client.channels.fetch(process.env.GANGBANK_OVERVIEW_CHANNEL_ID);

  if (!channel) return;

  if (!config.supporterMessages) {
    config.supporterMessages = {};
  }

  const { supporters } = calculateTopSupporters();

  let description = 'Nur freiwillige Sonderzahlungen zählen.\n\n';

  if (supporters.length === 0) {
    description += 'Noch keine Supporter-Zahlungen in diesem Jahr.';
  } else {
    const medals = ['🥇', '🥈', '🥉'];

description += supporters
  .map((supporter, index) => {
    const medal = medals[index] || '🏅';
    return `${medal} <@${supporter.userId}> — **${supporter.total} €**`;
  })
  .join('\n');
  }

  const embed = new EmbedBuilder()
    .setTitle(`🏆 TOP 3 SUPPORTER ${currentYear}`)
    .setDescription(description)
    .setFooter({ text: `Loco GangBank ${currentYear}` })
    .setTimestamp();

  let message = null;
  const existingMessageId = config.supporterMessages[currentYear];

  if (existingMessageId) {
    try {
      message = await channel.messages.fetch(existingMessageId);
      await message.edit({ embeds: [embed] });
      return;
    } catch (error) {
      console.log(`Supporter-Nachricht für ${currentYear} nicht gefunden, erstelle neue.`);
    }
  }

  message = await channel.send({ embeds: [embed] });

  config.currentYear = currentYear;
  config.supporterMessages[currentYear] = message.id;
  writeJson('data/config.json', config);
}

module.exports = {
  calculateTopSupporters,
  updateSupportersMessage
};