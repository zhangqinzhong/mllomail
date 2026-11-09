const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const privateMail = {
  subject: 'Private subject sentinel',
  text: 'Private plain-text body sentinel',
  html: '<p>Private HTML body sentinel</p>',
  from: { name: 'Private sender name', address: 'sender@example.test' },
  to: [{ name: 'Private recipient name', address: 'recipient@example.test' }],
  messageId: '<private-message-id@example.test>',
  headers: [{ key: 'x-private-header', value: 'Private header sentinel' }],
  attachments: [{ filename: 'private-attachment.txt', content: 'Private attachment sentinel' }],
};
const privateWebhookUrl = 'https://hooks.example.test/private-path?token=private-token';
const privateDetails = JSON.stringify({ mail: privateMail, url: privateWebhookUrl });

function privateError() {
  const error = new Error(privateDetails, { cause: new Error(privateDetails) });
  error.name = privateDetails;
  error.stack = privateDetails;
  error.query = privateDetails;
  return error;
}

function receiver({ failAt, targetExists = true, webhookEnabled = true, parsedMail = privateMail, error = privateError() } = {}) {
  const logs = [];
  const inserts = [];
  const deliveries = [];
  const receivedAt = new Date('2026-01-01T00:00:00Z');
  const target = { id: 'private-mailbox-id', userId: 'private-user-id', address: 'recipient@example.test' };
  const message = { from: 'sender@example.test', to: 'RECIPIENT@example.test', raw: 'Private raw MIME sentinel' };
  let parsedRaw;
  let recipientQuery;

  function fail(stage) {
    if (failAt === stage) throw error;
  }

  const db = {
    query: {
      emails: { findFirst: async query => {
        recipientQuery = query;
        fail('lookup');
        return targetExists ? target : undefined;
      } },
      webhooks: { findFirst: async () => {
        fail('webhookLookup');
        return { enabled: webhookEnabled, url: privateWebhookUrl };
      } },
    },
    insert: () => ({ values: value => {
      inserts.push(value);
      return { returning: () => ({ get: async () => {
        fail('insert');
        return { ...value, id: 'private-saved-message-id', receivedAt };
      } }) };
    } }),
  };

  const modules = {
    'drizzle-orm/d1': { drizzle: () => { fail('initialize'); return db; } },
    '../app/lib/schema': { messages: {}, emails: {}, webhooks: {} },
    'drizzle-orm': { eq: (column, value) => ({ column, value }), sql: () => ({}) },
    'postal-mime': { default: { parse: async raw => {
      parsedRaw = raw;
      fail('parse');
      return parsedMail;
    } } },
    '../app/config/webhook': { WEBHOOK_CONFIG: { EVENTS: { NEW_MESSAGE: 'new_message' } } },
    '../app/lib/webhook': { callWebhook: async (url, payload) => {
      deliveries.push({ url, payload });
      fail('webhook');
    } },
  };
  const exports = {};
  const filename = path.join(__dirname, '../workers/email-receiver.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const capturedConsole = Object.fromEntries(
    ['log', 'error', 'warn', 'info', 'debug', 'dir', 'table', 'trace'].map(level => [
      level, (...args) => logs.push([level, ...args]),
    ]),
  );
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`);
      return modules[name];
    },
    console: capturedConsole,
  }, { filename });

  return {
    run: () => exports.default.email(message, { DB: {} }),
    logs, inserts, deliveries, receivedAt, target, message,
    parsedRaw: () => parsedRaw,
    recipientQuery: () => recipientQuery,
  };
}

test('successful receive preserves mail and webhook data but logs only a fixed event', async () => {
  const ctx = receiver();
  await ctx.run();
  assert.equal(ctx.parsedRaw(), ctx.message.raw);
  assert.equal(ctx.recipientQuery().where.value, ctx.message.to.toLowerCase());
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.inserts)), [{
    emailId: ctx.target.id,
    fromAddress: ctx.message.from,
    subject: privateMail.subject,
    content: privateMail.text,
    html: privateMail.html,
    type: 'received',
  }]);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.deliveries)), [{
    url: privateWebhookUrl,
    payload: {
      event: 'new_message',
      data: {
        emailId: ctx.target.id,
        messageId: 'private-saved-message-id',
        fromAddress: ctx.message.from,
        subject: privateMail.subject,
        content: privateMail.text,
        html: privateMail.html,
        receivedAt: ctx.receivedAt.toISOString(),
        toAddress: ctx.target.address,
      },
    },
  }]);
  assert.deepEqual(ctx.logs, [['log', 'Email processed']]);
});

test('disabled webhook and absent MIME fields retain existing behavior', async () => {
  const ctx = receiver({ webhookEnabled: false, parsedMail: {} });
  await ctx.run();
  assert.equal(ctx.inserts[0].subject, '(无主题)');
  assert.equal(ctx.inserts[0].content, '');
  assert.equal(ctx.inserts[0].html, '');
  assert.equal(ctx.deliveries.length, 0);
  assert.deepEqual(ctx.logs, [['log', 'Email processed']]);
});

test('missing mailbox logs no address or parsed mail and does not save or notify', async () => {
  const ctx = receiver({ targetExists: false });
  await ctx.run();
  assert.deepEqual(ctx.logs, [['error', 'Email not found']]);
  assert.equal(ctx.inserts.length, 0);
  assert.equal(ctx.deliveries.length, 0);
});

for (const stage of ['lookup', 'insert', 'webhookLookup']) {
  test(`${stage} failure logs no query parameters, error details or mail`, async () => {
    const ctx = receiver({ failAt: stage });
    await ctx.run();
    assert.deepEqual(ctx.logs, [['error', 'Failed to process email']]);
    assert.equal(ctx.deliveries.length, 0);
  });
}

test('webhook failure keeps the saved message and logs no URL, payload or raw error', async () => {
  const ctx = receiver({ failAt: 'webhook' });
  await ctx.run();
  assert.equal(ctx.inserts.length, 1);
  assert.equal(ctx.deliveries.length, 1);
  assert.deepEqual(ctx.logs, [
    ['error', 'Failed to send webhook'],
    ['log', 'Email processed'],
  ]);
});

for (const stage of ['initialize', 'parse']) {
  test(`${stage} still rejects, without exposing the original exception to runtime logs`, async () => {
    const original = privateError();
    const ctx = receiver({ failAt: stage, error: original });
    await assert.rejects(ctx.run, error => {
      assert.notEqual(error, original);
      assert.equal(error.name, 'Error');
      assert.equal(error.message, 'Failed to initialize or parse email');
      assert.equal(error.cause, undefined);
      assert.equal(error.query, undefined);
      assert.equal(error.stack.includes(privateDetails), false);
      return true;
    });
    assert.deepEqual(ctx.logs, []);
    assert.equal(ctx.inserts.length, 0);
    assert.equal(ctx.deliveries.length, 0);
  });
}

test('non-Error rejection values never reach logs', async () => {
  const ctx = receiver({ failAt: 'webhook', error: privateDetails });
  await ctx.run();
  assert.deepEqual(ctx.logs, [
    ['error', 'Failed to send webhook'],
    ['log', 'Email processed'],
  ]);
});
