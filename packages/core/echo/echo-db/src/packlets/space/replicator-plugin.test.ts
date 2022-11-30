//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { describe, test, afterTest } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';

import { TestFeedBuilder } from '../common';
import { TestAgentBuilder } from './testing';

describe('space/replicator-plugin', () => {
  test('replicates a feed', async () => {
    const builder = new TestAgentBuilder();
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic, []);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic, []);

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    //
    // Create feeds.
    //

    const builder1 = new TestFeedBuilder();
    const feedStore1 = builder1.createFeedStore();

    const builder2 = new TestFeedBuilder();
    const feedStore2 = builder2.createFeedStore();

    const feed1 = await feedStore1.openFeed(await builder1.keyring.createKey(), { writable: true });
    const feed2 = await feedStore2.openFeed(feed1.key);

    await protocol1.addFeed(feed1);
    await protocol2.addFeed(feed2);

    //
    // Append message.
    //

    // TODO(burdon): Append batch of messages.
    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      // Received message appended before replication.
      expect(feed2.properties.length).toEqual(1);
    });

    // TODO(burdon): Append batch of messages.
    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      // Received message appended after replication.
      expect(feed2.properties.length).toEqual(2);
    });
  });
});
