const { readJson } = require('./helpers');
const { getCurrentYear, getTransactionYear } = require('./year');

async function sendReminder(client) {
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

  let reminderText = `🔔 **GangBank Reminder ${currentYear}**\n\n`;

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
    console.log('❌ Reminder-Channel nicht gefunden.');
    return;
  }

  await reminderChannel.send(reminderText);
  console.log(`✅ Automatischer Reminder für ${currentYear} wurde gesendet.`);
}

module.exports = {
  sendReminder
};