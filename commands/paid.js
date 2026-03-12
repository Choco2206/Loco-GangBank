const { SlashCommandBuilder } = require('discord.js');
const { readJson, writeJson, generateId } = require('../utils/helpers');
const { updateOverview } = require('../utils/overview');
const { updateSupportersMessage } = require('../utils/supporters');
const { getCurrentYear, getTransactionYear } = require('../utils/year');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zahlung')
    .setDescription('Trägt eine Zahlung ein oder markiert eine Strafe als bezahlt')
    .addUserOption(option =>
      option
        .setName('spieler')
        .setDescription('Spieler, für den die Zahlung eingetragen wird')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Art der Zahlung')
        .setRequired(true)
        .addChoices(
          { name: 'Jahresbeitrag', value: 'jahresbeitrag' },
          { name: 'Sonderzahlung', value: 'sonderzahlung' },
          { name: 'Strafe bezahlen', value: 'strafe_bezahlen' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('betrag')
        .setDescription('Betrag in Euro, nur bei Jahresbeitrag oder Sonderzahlung nötig')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('notiz')
        .setDescription('Optionale Notiz')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    try {
      const user = interaction.options.getUser('spieler');
      const grund = interaction.options.getString('grund');
      const manuellerBetrag = interaction.options.getInteger('betrag');
      const notiz = interaction.options.getString('notiz');

      const config = readJson('data/config.json', {});
      const transactions = readJson('data/transactions.json', []);
      const currentYear = getCurrentYear();

      const transaktionenChannel = await client.channels.fetch(
        process.env.GANGBANK_TRANSACTIONS_CHANNEL_ID
      );

      if (grund === 'jahresbeitrag') {
        const betrag = manuellerBetrag ?? config.yearlyFee ?? 12;

        const bereitsBezahlt = transactions.some(
          tx =>
            tx.userId === user.id &&
            tx.reason === 'jahresbeitrag' &&
            tx.status === 'bezahlt' &&
            getTransactionYear(tx, currentYear) === currentYear
        );

        if (bereitsBezahlt) {
          return interaction.reply({
            content: `❌ ${user.username} hat den Jahresbeitrag für ${currentYear} bereits bezahlt.`,
            ephemeral: true
          });
        }

        const neueTransaktion = {
          id: generateId('txn'),
          userId: user.id,
          name: user.username,
          type: 'income',
          amount: betrag,
          reason: 'jahresbeitrag',
          note: notiz || `Jahresbeitrag ${currentYear}`,
          status: 'bezahlt',
          year: currentYear
        };

        transactions.push(neueTransaktion);
        writeJson('data/transactions.json', transactions);

        if (transaktionenChannel) {
          await transaktionenChannel.send(
            `📒 **Neue Zahlung eingetragen**\n\n` +
            `Spieler: <@${user.id}>\n` +
            `Typ: Jahresbeitrag\n` +
            `Jahr: ${currentYear}\n` +
            `Betrag: ${betrag} €\n` +
            `Status: bezahlt` +
            `${notiz ? `\nNotiz: ${notiz}` : ''}`
          );
        }

        await updateOverview(client);

        return interaction.reply({
          content: `✅ Jahresbeitrag ${currentYear} für ${user.username} wurde eingetragen.`,
          ephemeral: true
        });
      }

      if (grund === 'sonderzahlung') {
        if (!manuellerBetrag || manuellerBetrag <= 0) {
          return interaction.reply({
            content: '❌ Bei einer Sonderzahlung musst du einen gültigen Betrag angeben.',
            ephemeral: true
          });
        }

        const neueTransaktion = {
          id: generateId('txn'),
          userId: user.id,
          name: user.username,
          type: 'income',
          amount: manuellerBetrag,
          reason: 'sonderzahlung',
          note: notiz || `Sonderzahlung ${currentYear}`,
          status: 'bezahlt',
          year: currentYear
        };

        transactions.push(neueTransaktion);
        writeJson('data/transactions.json', transactions);

        if (transaktionenChannel) {
          await transaktionenChannel.send(
            `📒 **Neue Zahlung eingetragen**\n\n` +
            `Spieler: <@${user.id}>\n` +
            `Typ: Sonderzahlung\n` +
            `Jahr: ${currentYear}\n` +
            `Betrag: ${manuellerBetrag} €\n` +
            `Status: bezahlt` +
            `${notiz ? `\nNotiz: ${notiz}` : ''}`
          );
        }

        await updateOverview(client);
        await updateSupportersMessage(client);

        return interaction.reply({
          content: `✅ Sonderzahlung ${currentYear} für ${user.username} wurde eingetragen.`,
          ephemeral: true
        });
      }

      if (grund === 'strafe_bezahlen') {
        const offeneStrafen = transactions.filter(
          tx =>
            tx.userId === user.id &&
            tx.reason === 'strafe' &&
            tx.status === 'offen' &&
            getTransactionYear(tx, currentYear) === currentYear
        );

        if (offeneStrafen.length === 0) {
          return interaction.reply({
            content: `❌ ${user.username} hat aktuell keine offene Strafe für ${currentYear}.`,
            ephemeral: true
          });
        }

        const letzteOffeneStrafe = offeneStrafen[offeneStrafen.length - 1];
        letzteOffeneStrafe.status = 'bezahlt';

        if (notiz) {
          letzteOffeneStrafe.note = `${letzteOffeneStrafe.note} | bezahlt: ${notiz}`;
        }

        writeJson('data/transactions.json', transactions);

        if (letzteOffeneStrafe.strafenChannelId && letzteOffeneStrafe.strafenMessageId) {
          try {
            const strafenChannel = await client.channels.fetch(letzteOffeneStrafe.strafenChannelId);

            if (strafenChannel) {
              const strafenMessage = await strafenChannel.messages.fetch(letzteOffeneStrafe.strafenMessageId);

              if (strafenMessage) {
                await strafenMessage.edit(
                  `⚖️ **Strafe**\n\n` +
                  `Spieler: <@${user.id}>\n` +
                  `Grund: ${letzteOffeneStrafe.note}\n` +
                  `Jahr: ${currentYear}\n` +
                  `Betrag: ${letzteOffeneStrafe.amount} €\n` +
                  `Status: bezahlt`
                );
              }
            }
          } catch (error) {
            console.error('Fehler beim Aktualisieren der Strafen-Nachricht:', error);
          }
        }

        if (transaktionenChannel) {
          await transaktionenChannel.send(
            `📒 **Strafe als bezahlt markiert**\n\n` +
            `Spieler: <@${user.id}>\n` +
            `Jahr: ${currentYear}\n` +
            `Grund: ${letzteOffeneStrafe.note}\n` +
            `Betrag: ${letzteOffeneStrafe.amount} €\n` +
            `Status: bezahlt`
          );
        }

        await updateOverview(client);

        return interaction.reply({
          content: `✅ Offene Strafe ${currentYear} von ${user.username} wurde als bezahlt markiert.`,
          ephemeral: true
        });
      }

      return interaction.reply({
        content: '❌ Ungültige Zahlungsart.',
        ephemeral: true
      });
    } catch (error) {
      console.error(`Fehler beim Ausführen von /zahlung:`, error);

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
          content: '❌ Beim Ausführen des Befehls ist ein Fehler aufgetreten.',
          ephemeral: true
        });
      }

      return interaction.reply({
        content: '❌ Beim Ausführen des Befehls ist ein Fehler aufgetreten.',
          ephemeral: true
      });
    }
  }
};