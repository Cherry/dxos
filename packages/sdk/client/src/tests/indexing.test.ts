//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout } from '@dxos/async';
import { type ClientServicesProvider, type Space } from '@dxos/client-protocol';
import { Filter } from '@dxos/echo-db';
import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { create } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, test } from '@dxos/test';

import { Client } from '../client';
import { QueryOptions } from '../echo';
import { ContactType, TestBuilder } from '../testing';

describe('Index queries', () => {
  const john = 'John Doe';

  const initClient = async (services: ClientServicesProvider) => {
    const client = new Client({ services });
    await client.initialize();
    if (!client.experimental.graph.runtimeSchemaRegistry.isSchemaRegistered(ContactType)) {
      client.experimental.graph.runtimeSchemaRegistry.registerSchema(ContactType);
    }
    return client;
  };

  const addContact = async (space: Space, name: string) => {
    await space.waitUntilReady();
    const contact = create(ContactType, { name: john, identifiers: [] });
    space.db.add(contact);
    await space.db.flush();
    return contact;
  };

  const queryIndexedContact = async (space: Space, name: string) => {
    const receivedIndexedContact = new Trigger<ContactType>();
    const query = space.db.query(Filter.schema(ContactType), { dataLocation: QueryOptions.DataLocation.ALL });
    const unsub = query.subscribe(
      (query) => {
        log('Query results', {
          length: query.results.length,
          results: query.results.map(({ object, resolution }) => ({
            object: (object as any).toJSON(),
            resolution,
          })),
        });
        for (const result of query.results) {
          if (result.object instanceof ContactType && result.resolution?.source === 'index') {
            unsub();
            receivedIndexedContact.wake(result.object);
          }
        }
      },
      { fire: true },
    );
    const contact = await receivedIndexedContact.wait({ timeout: 5000 });
    expect(contact).to.be.instanceOf(ContactType);
    expect(contact.name).to.equal(john);
    return contact;
  };

  test('index queries work with client', async () => {
    const builder = new TestBuilder();
    afterTest(async () => {
      await builder.destroy();
    });
    const client = await initClient(builder.createLocal());
    afterTest(() => client.destroy());

    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await addContact(space, john);

    await queryIndexedContact(space, john);
  });

  test('indexes persists between client restarts', async () => {
    let spaceKey: PublicKey;

    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    {
      const client = await initClient(builder.createLocal());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      spaceKey = space.key;

      await addContact(space, john);
      await queryIndexedContact(space, john);

      await client.destroy();
    }

    {
      const client = await initClient(builder.createLocal());
      afterTest(() => client.destroy());
      await asyncTimeout(client.spaces.isReady.wait(), 5000);
      const space = client.spaces.get(spaceKey)!;
      await space.waitUntilReady();

      await queryIndexedContact(space, john);
    }
  });

  test('index available data', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    let spaceKey: PublicKey;
    {
      const client = await initClient(builder.createLocal());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      spaceKey = space.key;

      await addContact(space, john);
      await queryIndexedContact(space, john);

      await client.destroy();
    }

    await builder.level.open();
    await builder.level.sublevel('index-storage').clear();

    {
      const client = await initClient(builder.createLocal());
      afterTest(() => client.destroy());
      await client.spaces.isReady.wait({ timeout: 1000 });
      const space = client.spaces.get(spaceKey)!;
      await asyncTimeout(space.waitUntilReady(), 1000);

      await queryIndexedContact(space, john);
    }
  });

  test('re-index', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    let spaceKey: PublicKey;
    {
      const client = await initClient(builder.createLocal());
      await client.halo.createIdentity();

      const space = await client.spaces.create();
      spaceKey = space.key;

      await addContact(space, john);
      await queryIndexedContact(space, john);

      await client.destroy();
    }

    await builder.level.open();
    await builder.level.sublevel('index-storage').clear();
    await builder.level.sublevel('index-metadata').clear();

    {
      const client = await initClient(builder.createLocal());
      afterTest(() => client.destroy());
      await client.spaces.isReady.wait();
      const space = client.spaces.get(spaceKey)!;
      await asyncTimeout(space.waitUntilReady(), 1000);

      await client.services.services.QueryService?.reIndex();
      await queryIndexedContact(space, john);
    }
  });
});
