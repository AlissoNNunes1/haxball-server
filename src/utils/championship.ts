import path from 'path';

import { CustomSettings } from '../Global';

function transformSetting(setting: CustomSettings, list: Record<string, CustomSettings>) {
  if (!setting || !setting.extends) return setting;
  const extensions = typeof setting.extends === 'string' ? [setting.extends] : setting.extends;
  let merged: CustomSettings = {};

  for (const extKey of extensions) {
    const ext = list[extKey];
    if (ext) {
      const resolved = transformSetting(ext, list);
      merged = { ...merged, ...resolved };
    }
  }

  merged = { ...merged, ...setting };
  delete merged.extends;
  return merged;
}

function loadPresets(): Record<string, CustomSettings> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { presets } = require('../../shared/config/championship.cjs');
  return presets || {};
}

function resolvePreset(key: string): CustomSettings {
  const presets = loadPresets();
  const found = presets[key];
  if (!found) {
    throw new Error(`Preset ${key} nao encontrado`);
  }
  if (!found.extends) return found;
  return transformSetting({ ...found }, presets);
}

export interface ChampionshipSettingsInput {
  preset: string;
  home: string;
  away: string;
  allowSpectators?: boolean;
  password?: string;
  customName?: string;
}

export function buildChampionshipSettings(input: ChampionshipSettingsInput): {
  settings: CustomSettings;
  roomName: string;
} {
  const preset = resolvePreset(input.preset);
  const reserved = (preset as any).reserved?.haxball || {};
  const baseName = preset.name || 'CIRS Championship';
  const roomName = input.customName || `${baseName} - ${input.home} x ${input.away}`;

  const settings: CustomSettings = {
    ...preset,
    championship: true,
    disableBalance: true,
    allowSpectators: input.allowSpectators ?? (preset as any).allowSpectators ?? true,
    homeTeam: input.home,
    awayTeam: input.away,
    'reserved.haxball.roomName': roomName,
    'reserved.haxball.password': input.password ?? reserved.password ?? '',
    'reserved.haxball.maxPlayers': reserved.maxPlayers ?? 30,
    'reserved.haxball.public': reserved.public ?? false,
    'reserved.haxball.noPlayer': reserved.noPlayer ?? true,
  };

  if (reserved.geo) {
    settings['reserved.haxball.geo'] = JSON.stringify(reserved.geo);
  }

  if ((preset as any).map) settings.map = String((preset as any).map);
  if ((preset as any).format) settings.format = String((preset as any).format);

  const rules = (preset as any).rules || {};
  if (rules.matchTimeMinutes != null)
    settings['rule.matchTimeMinutes'] = Number(rules.matchTimeMinutes);
  if (rules.extraTime != null) settings['rule.extraTime'] = Boolean(rules.extraTime);
  if (rules.goldenGoal != null) settings['rule.goldenGoal'] = Boolean(rules.goldenGoal);
  if (rules.fouls != null) settings['rule.fouls'] = Boolean(rules.fouls);
  if (rules.offsides != null) settings['rule.offsides'] = Boolean(rules.offsides);
  if (rules.barriers != null) settings['rule.barriers'] = Boolean(rules.barriers);

  delete (settings as any).reserved;

  return { settings, roomName };
}

export function resolveChampionshipBotPath(): string {
  return path.resolve(process.cwd(), 'bots', 'cirs-championship.js');
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
