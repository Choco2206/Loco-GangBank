const { SlashCommandBuilder } = require('discord.js');
const { readJson } = require('../utils/helpers');
const { getCurrentYear, getTransactionYear } = require('../utils/year');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('offene-zahlungen')
    .setDescription('Zeigt alle offenen Jahresbeiträge und Strafen an'),

  async execute(interaction) {
    const members = readJson('data/members.json', []);
    const transactions = readJson('data/transactions.json', []);
    const config = readJson('data/config.json', {});
    const currentYear = getCurrentYear();

    const aktiveMitglieder = members.filter(member => member.active);
    const yearTransactions = transactions.filter(
      tx => getTransactionYear(tx, currentYear) === currentYear
    );

    const offeneJahresbeitraege = aktiveMitglieder.filter(member => {
      return !yearTransactions.some(tx =>
        tx.userId === member.userId &&
        tx.reason === 'jahresbeitrag' &&
        tx.status === 'bezahlt'
      );
    });

    const offeneStrafenMap = new Map();

    yearTransactions.forEach(tx => {
      if (tx.reason === 'strafe' && tx.status === 'offen' && tx.userId) {
        if (!offeneStrafenMap.has(tx.userId)) {
          offeneStrafenMap.set(tx.userId, {
            userId: tx.userId,
            name: tx.name,
            total: 0,
            anzahl: 0
          });
        }

        const eintrag = offeneStrafenMap.get(tx.userId);
        eintrag.total += tx.amount;
        eintrag.anzahl += 1;
      }
    });

    const offeneStrafen = Array.from(offeneStrafenMap.values());

    const jahresbeitragText = offeneJahresbeitraege.length > 0
      ? offeneJahresbeitraege.map(member => `<@${member.userId}>`).join('\n')
      : 'Niemand';

    const strafenText = offeneStrafen.length > 0
      ? offeneStrafen
          .map(eintrag => `<@${eintrag.userId}> — ${eintrag.total} € (${eintrag.anzahl} offen)`)
          .join('\n')
      : 'Niemand';

    const yearlyFee = config.yearlyFee ?? 12;

    await interaction.reply({
      content:
        `💰 **Offene Zahlungen ${currentYear}**\n\n` +
        `**Jahresbeitrag (${yearlyFee} €) offen:**\n${jahresbeitragText}\n\n` +
        `**Offene Strafen:**\n${strafenText}`,
      ephemeral: true
    });
  }
};