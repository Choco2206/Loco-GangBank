const { SlashCommandBuilder } = require('discord.js');
const { readJson } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Sendet einen Reminder für offene Zahlungen in den Reminder-Channel'),

  async execute(interaction, client) {
    const members = readJson('data/members.json', []);
    const transactions = readJson('data/transactions.json', []);
    const config = readJson('data/config.json', {});

    const aktiveMitglieder = members.filter(member => member.active);

    const offeneJahresbeitraege = aktiveMitglieder.filter(member => {
      return !transactions.some(tx =>
        tx.userId === member.userId &&
        tx.reason === 'jahresbeitrag' &&
        tx.status === 'bezahlt'
      );
    });

    const offeneStrafenMap = new Map();

    transactions.forEach(tx => {
      if (tx.reason === 'strafe' && tx.status === 'offen' && tx.userId) {
        if (!offeneStrafenMap.has(tx.userId)) {
          offeneStrafenMap.set(tx.userId, {
            userId: tx.userId,
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

    const yearlyFee = config.yearlyFee ?? 12;

    let reminderText = `🔔 **GangBank Reminder**\n\n`;

    reminderText += `**Offene Jahresbeiträge (${yearlyFee} €):**\n`;
    reminderText += offeneJahresbeitraege.length > 0
      ? offeneJahresbeitraege.map(member => `<@${member.userId}>`).join('\n')
      : `Niemand`;
    
    reminderText += `\n\n**Offene Strafen:**\n`;
    reminderText += offeneStrafen.length > 0
      ? offeneStrafen
          .map(eintrag => `<@${eintrag.userId}> — ${eintrag.total} € (${eintrag.anzahl} offen)`)
          .join('\n')
      : `Niemand`;

    reminderText += `\n\nBitte kümmert euch zeitnah um offene Zahlungen. 💰`;

    const reminderChannel = await client.channels.fetch(
      process.env.GANGBANK_REMINDER_CHANNEL_ID
    );

    if (!reminderChannel) {
      return interaction.reply({
        content: '❌ Reminder-Channel wurde nicht gefunden.',
        ephemeral: true
      });
    }

    await reminderChannel.send(reminderText);

    await interaction.reply({
      content: '✅ Reminder wurde im Reminder-Channel gepostet.',
      ephemeral: true
    });
  }
};