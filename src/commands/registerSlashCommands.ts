import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { log } from '../utils/log';

/**
 * Registra todos os Slash Commands no Discord
 * Estrategia: Compara com comandos existentes e atualiza apenas os que mudaram
 * Mais eficiente que deletar tudo toda vez
 */
export async function registerSlashCommands(token: string, clientId: string, guildId?: string) {
  const commands = [
    // Comandos de Admin
    new SlashCommandBuilder().setName('help').setDescription('Lista de comandos disponiveis'),

    new SlashCommandBuilder().setName('info').setDescription('Informacoes do servidor'),

    new SlashCommandBuilder().setName('meminfo').setDescription('Uso de CPU e memoria'),

    new SlashCommandBuilder().setName('metrics').setDescription('Metricas das salas'),

    new SlashCommandBuilder()
      .setName('championship')
      .setDescription('Gerenciar salas de campeonato temporarias')
      .addSubcommand((sub) =>
        sub
          .setName('open')
          .setDescription('Abrir sala de campeonato')
          .addStringOption((option) =>
            option
              .setName('preset')
              .setDescription('Preset de campeonato (rs5, rs6, rs7, rs11, default)')
              .setRequired(true)
              .addChoices(
                { name: 'default', value: 'default' },
                { name: 'rs5', value: 'rs5' },
                { name: 'rs6', value: 'rs6' },
                { name: 'rs7', value: 'rs7' },
                { name: 'rs11', value: 'rs11' }
              )
          )
          .addStringOption((option) =>
            option.setName('home').setDescription('Time mandante').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('away').setDescription('Time visitante').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('token').setDescription('Token do Haxball').setRequired(true)
          )
          .addBooleanOption((option) =>
            option
              .setName('spectators')
              .setDescription('Permitir espectadores (padrao: sim)')
              .setRequired(false)
          )
          .addStringOption((option) =>
            option.setName('password').setDescription('Senha opcional da sala').setRequired(false)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('close')
          .setDescription('Fechar sala de campeonato')
          .addStringOption((option) =>
            option
              .setName('pid')
              .setDescription('PID da sala ou "all" para fechar todas')
              .setRequired(true)
          )
      ),

    new SlashCommandBuilder()
      .setName('open')
      .setDescription('Abrir uma sala')
      .addStringOption((option) =>
        option.setName('bot').setDescription('Nome do bot a abrir').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('token').setDescription('Token do Haxball').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('setting')
          .setDescription('Configuracao customizada (opcional)')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('close')
      .setDescription('Fechar uma sala')
      .addStringOption((option) =>
        option
          .setName('pid')
          .setDescription('PID da sala ou "all" para fechar todas')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('reload')
      .setDescription('Recarregar configuracao do servidor'),

    new SlashCommandBuilder().setName('exit').setDescription('Desligar servidor'),

    new SlashCommandBuilder().setName('tokenlink').setDescription('Link para obter token Haxball'),

    // Comandos de Autenticacao (publicos)
    new SlashCommandBuilder()
      .setName('register')
      .setDescription('Criar conta CIRS')
      .addStringOption((option) =>
        option.setName('nick').setDescription('Seu nick do Haxball').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('senha').setDescription('Senha para sua conta').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('linkdiscord')
      .setDescription('Vincular Discord a conta existente')
      .addStringOption((option) =>
        option.setName('nick').setDescription('Seu nick do Haxball').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('senha').setDescription('Senha da sua conta').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Ver perfil de jogador')
      .addStringOption((option) =>
        option
          .setName('nick')
          .setDescription('Nick do jogador (deixe vazio para ver o seu)')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('ranking')
      .setDescription('Ver ranking de jogador')
      .addStringOption((option) =>
        option
          .setName('nick')
          .setDescription('Nick do jogador (deixe vazio para ver o seu)')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('top')
      .setDescription('Ver top 10 jogadores')
      .addStringOption((option) =>
        option
          .setName('criterio')
          .setDescription('Ordenar por pontos ou ranking')
          .setRequired(false)
          .addChoices({ name: 'Ranking', value: 'ranking' }, { name: 'Pontos', value: 'pontos' })
      ),

    new SlashCommandBuilder()
      .setName('authhelp')
      .setDescription('Ajuda sobre sistema de autenticacao'),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    log('DISCORD', `Comparando ${commands.length} slash commands com registrados...`);

    // Busca comandos existentes (guild ou global)
    let existingCommands: any[] = [];
    if (guildId) {
      existingCommands = (await rest.get(
        Routes.applicationGuildCommands(clientId, guildId)
      )) as any[];
      log('DISCORD', `Encontrados ${existingCommands.length} comandos no servidor.`);
    } else {
      existingCommands = (await rest.get(Routes.applicationCommands(clientId))) as any[];
      log('DISCORD', `Encontrados ${existingCommands.length} comandos globais.`);
    }

    // Nomes dos novos comandos
    const newCommandNames = new Set(commands.map((c: any) => c.name));

    // Deleta apenas comandos que nao existem mais na nova lista
    let deletedCount = 0;
    for (const existing of existingCommands) {
      if (!newCommandNames.has(existing.name)) {
        if (guildId) {
          await rest.delete(Routes.applicationGuildCommand(clientId, guildId, existing.id));
        } else {
          await rest.delete(Routes.applicationCommand(clientId, existing.id));
        }
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      log('DISCORD', `${deletedCount} comando(s) antigo(s) removido(s).`);
    }

    // Atualiza com lista completa (Discord faz merge automatico)
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      log('DISCORD', `${commands.length} Slash commands atualizados no servidor ${guildId}!`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      log('DISCORD', `${commands.length} Slash commands atualizados globalmente!`);
    }

    return true;
  } catch (error) {
    console.error('Erro ao registrar slash commands:', error);
    return false;
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
