const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { addDays, subDays } = require('date-fns');
const { randomUUID } = require('crypto');

const envFiles = ['.env.local', '.env'];

for (const file of envFiles) {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
  }
}

const prisma = new PrismaClient();

function log(message) {
  process.stdout.write(`${message}\n`);
}

function error(message) {
  process.stderr.write(`${message}\n`);
}

async function findDefaultAdmin() {
  const user = await prisma.user.findFirst({
    where: { username: 'admin' },
    select: { id: true },
  });

  if (!user) {
    throw new Error('Default admin user with username "admin" not found.');
  }

  return user.id;
}

async function upsertWebsite(userId) {
  const websiteId = '22222222-2222-2222-2222-222222222222';

  await prisma.website.upsert({
    where: { id: websiteId },
    create: {
      id: websiteId,
      name: 'Again Demo',
      domain: 'again-demo.com',
      userId,
    },
    update: {
      userId,
    },
  });

  return websiteId;
}

const utmSamples = [
  {
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'fall_sale',
    utmContent: 'ad_variant_a',
    utmTerm: 'analytics+software',
  },
  {
    utmSource: 'linkedin',
    utmMedium: 'paid_social',
    utmCampaign: 'b2b_launch',
    utmContent: 'carousel',
    utmTerm: 'marketing+leaders',
  },
  {
    utmSource: 'newsletter',
    utmMedium: 'email',
    utmCampaign: 'october_digest',
    utmContent: 'cta_top_banner',
    utmTerm: 'utm+insights',
  },
  {
    utmSource: 'partners',
    utmMedium: 'referral',
    utmCampaign: 'agency_referrals',
    utmContent: 'landing_page',
    utmTerm: 'agency+analytics',
  },
  {
    utmSource: 'twitter',
    utmMedium: 'social',
    utmCampaign: 'product_update',
    utmContent: 'video_clip',
    utmTerm: 'again+analytics',
  },
];

function buildSessions(websiteId) {
  const sessions = [];
  const today = new Date();

  for (let i = 0; i < utmSamples.length; i += 1) {
    sessions.push({
      id: randomUUID(),
      websiteId,
      browser: i % 2 === 0 ? 'Chrome' : 'Safari',
      os: i % 2 === 0 ? 'macOS' : 'Windows',
      device: 'Desktop',
      country: 'US',
      createdAt: subDays(today, i * 2),
    });
  }

  return sessions;
}

function buildEvents(websiteId, sessionIds) {
  const events = [];
  const today = new Date();

  sessionIds.forEach((sessionId, index) => {
    const sample = utmSamples[index % utmSamples.length];

    for (let i = 0; i < 5; i += 1) {
      events.push({
        id: randomUUID(),
        websiteId,
        sessionId,
        visitId: randomUUID(),
        createdAt: addDays(subDays(today, index), -i),
        urlPath: `/feature-${(index % 3) + 1}`,
        urlQuery: new URLSearchParams({
          utm_source: sample.utmSource,
          utm_medium: sample.utmMedium,
          utm_campaign: sample.utmCampaign,
          utm_content: sample.utmContent,
          utm_term: sample.utmTerm,
        }).toString(),
        utmSource: sample.utmSource,
        utmMedium: sample.utmMedium,
        utmCampaign: sample.utmCampaign,
        utmContent: sample.utmContent,
        utmTerm: sample.utmTerm,
        referrerDomain: `${sample.utmSource}.com`,
        eventType: 1,
      });
    }
  });

  return events;
}

async function seed() {
  log('Seeding demo data...');

  const userId = await findDefaultAdmin();
  const websiteId = await upsertWebsite(userId);

  const sessions = buildSessions(websiteId);
  const sessionIds = sessions.map(session => session.id);

  await prisma.websiteEvent.deleteMany({ where: { websiteId } });
  await prisma.session.deleteMany({ where: { websiteId } });

  await prisma.session.createMany({ data: sessions });
  await prisma.websiteEvent.createMany({ data: buildEvents(websiteId, sessionIds) });

  log('Seed complete.');
}

seed()
  .catch(err => {
    error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
