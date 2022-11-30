//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/keys';
import { ObjectModel } from '@dxos/object-model';
import { describe, test } from '@dxos/test';

import { setupClient } from '../testutils';
import { EchoBot, TEST_ECHO_TYPE } from './echo-bot';

describe('Echo Bot', () => {
  test('Starts a bot', async () => {
    const { client, space, invitation } = await setupClient();
    const bot = new EchoBot(TEST_ECHO_TYPE);

    await bot.initialize({
      id: PublicKey.random().toHex(),
      config: {},
      invitation
    });

    const command = PublicKey.random().asUint8Array();
    await bot.command({
      botId: PublicKey.random().toHex(),
      command
    });

    const item = await space.database.waitForItem<ObjectModel>({
      type: TEST_ECHO_TYPE
    });
    const payload = item.model.get('payload');
    expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

    await bot.stop();
    await client.destroy();
  });
});
