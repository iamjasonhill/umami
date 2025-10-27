import { Prisma } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { loadAttributionConfig } from '../src/lib/attribution/config';
import { normalizeAttributionInput } from '../src/lib/attribution/normalize';
import { classifyAttribution } from '../src/lib/attribution/classifier';

/* eslint-disable no-console */

interface BackfillOptions {
  websiteId?: string;
  batchSize: number;
  dryRun: boolean;
  limit?: number;
  force: boolean;
  onlyDirect: boolean;
}

function parseArgs(argv: string[]): BackfillOptions {
  const options: BackfillOptions = {
    batchSize: 500,
    dryRun: false,
    force: false,
    onlyDirect: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--website' || arg === '-w') {
      options.websiteId = argv[++i];
    } else if (arg === '--batch' || arg === '-b') {
      options.batchSize = Number.parseInt(argv[++i] ?? '', 10) || options.batchSize;
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--limit' || arg === '-l') {
      options.limit = Number.parseInt(argv[++i] ?? '', 10) || undefined;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--only-direct') {
      options.onlyDirect = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);
  const client = prisma.client;

  const { config: attributionConfig, version } = await loadAttributionConfig();

  let processed = 0;
  let updated = 0;

  console.log('Starting channel backfill with options:', options);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const sessions = await client.session.findMany({
      where: {
        AND: [
          { websiteId: options.websiteId },
          options.force
            ? undefined
            : {
                OR: [
                  { channelFirst: null },
                  { channelLast: null },
                  { channelStrengthFirst: null },
                  { channelStrengthLast: null },
                ],
              },
          options.onlyDirect
            ? {
                channelFirst: 'direct',
                rawReferrerDomain: { not: null },
              }
            : undefined,
        ].filter(Boolean) as Prisma.SessionWhereInput[],
      },
      take: options.batchSize,
      orderBy: { createdAt: 'asc' },
    });

    if (sessions.length === 0) {
      break;
    }

    for (const session of sessions) {
      processed += 1;

      if (options.limit && processed > options.limit) {
        console.log('Reached limit, exiting.');
        return;
      }

      const normalized = normalizeAttributionInput({
        utmSource: session.rawSource,
        utmMedium: session.rawMedium,
        utmCampaign: session.rawCampaign,
        utmContent: session.rawContent,
        utmTerm: session.rawTerm,
        referrerHost: session.rawReferrerDomain,
        userAgent: session.userAgent,
      });

      const result = classifyAttribution(normalized, attributionConfig);

      const updateData: Prisma.SessionUncheckedUpdateInput = {};

      if (!session.channelFirst) {
        Object.assign(updateData, {
          channelFirst: result.channel,
          channelStrengthFirst: result.strength,
        });
      }

      const hasWeakerLast =
        (session.channelStrengthLast ?? Number.NEGATIVE_INFINITY) < result.strength;

      if (!session.channelLast || hasWeakerLast) {
        Object.assign(updateData, {
          channelLast: result.channel,
          channelStrengthLast: result.strength,
        });
      }

      if (!session.channelReason) {
        Object.assign(updateData, { channelReason: result.reasons as Prisma.InputJsonValue });
      }

      if (!session.attributionVersion) {
        Object.assign(updateData, { attributionVersion: version });
      }

      if (!options.force && Object.keys(updateData).length === 0) {
        continue;
      }

      updated += 1;

      if (options.dryRun) {
        console.log('[dry-run] would update session', session.id, updateData);
        continue;
      }

      await client.session.update({
        where: { id: session.id },
        data: updateData,
        skipDuplicates: false,
      });
    }

    console.log(`Processed ${processed} sessions (${updated} updates so far)...`);
  }

  console.log(`Backfill complete. Processed ${processed} sessions, updated ${updated}.`);
}

main()
  .catch(error => {
    console.error('Channel backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.client.$disconnect();
  });
