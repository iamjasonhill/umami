import yaml from 'js-yaml';
import prisma from '@/lib/prisma';
import type { AttributionConfigV1 } from './types';
import { attributionConfigV1Yaml, DEFAULT_ATTRIBUTION_CONFIG_VERSION } from './defaultConfig';

const CACHE_TTL_MS = 60_000;

export type LoadedAttributionConfig = {
  version: number;
  config: AttributionConfigV1;
};

let cache: { loadedAt: number; data: LoadedAttributionConfig } | null = null;

function parseYamlConfig(source: string): AttributionConfigV1 {
  const parsed = yaml.load(source);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid attribution config YAML');
  }

  return parsed as AttributionConfigV1;
}

async function fetchConfig(): Promise<LoadedAttributionConfig> {
  const record = await prisma.client.attributionConfig.findFirst({
    where: { active: true },
    orderBy: { version: 'desc' },
  });

  if (record) {
    return {
      version: record.version,
      config: parseYamlConfig(record.yaml),
    };
  }

  return {
    version: DEFAULT_ATTRIBUTION_CONFIG_VERSION,
    config: parseYamlConfig(attributionConfigV1Yaml),
  };
}

export async function loadAttributionConfig(): Promise<LoadedAttributionConfig> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const data = await fetchConfig();

  cache = {
    loadedAt: Date.now(),
    data,
  };

  return data;
}

export function clearAttributionConfigCache() {
  cache = null;
}
