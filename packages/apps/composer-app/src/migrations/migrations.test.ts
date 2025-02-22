//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { getSpaceProperty, setSpaceProperty, FolderType } from '@braneframe/types';
import { Client, PublicKey } from '@dxos/client';
import { type Space, Filter } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { create, Expando } from '@dxos/echo-schema';
import { afterEach, beforeEach, describe, test } from '@dxos/test';

import { migrations } from './migrations';

const testBuilder = new TestBuilder();

describe('Composer migrations', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    client.addSchema(FolderType, Expando);
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    space = client.spaces.default;
  });

  afterEach(async () => {
    await client.destroy();
  });

  test(migrations[0].version.toString(), async () => {
    const query = space.db.query(Filter.schema(FolderType));
    expect((await query.run({ timeout: 100 })).objects).to.have.lengthOf(0);

    await migrations[0].up({ space });
    const afterMigration = await query.run();
    expect(afterMigration.objects).to.have.lengthOf(1);
    expect(afterMigration.objects[0].name).to.equal(space.key.toHex());
    expect(getSpaceProperty(space, FolderType.typename)).to.equal(afterMigration.objects[0]);
  });

  test(migrations[1].version.toString(), async () => {
    const folder1 = space.db.add(create(FolderType, { name: space.key.toHex(), objects: [] }));
    const folder2 = space.db.add(create(FolderType, { name: space.key.toHex(), objects: [] }));
    const folder3 = space.db.add(create(FolderType, { name: space.key.toHex(), objects: [] }));
    setSpaceProperty(space, FolderType.typename, folder3);

    const keys = [...Array(9)].map(() => PublicKey.random().toHex());
    folder1.objects = keys.slice(0, 3).map((key) => create(Expando, { key }));
    folder2.objects = keys.slice(3, 6).map((key) => create(Expando, { key }));
    folder3.objects = keys.slice(6, 9).map((key) => create(Expando, { key }));

    const query = space.db.query(Filter.schema(FolderType));
    const beforeMigration = await query.run();
    expect(beforeMigration.objects).to.have.lengthOf(3);
    expect(beforeMigration.objects[0].name).to.equal(space.key.toHex());
    expect(beforeMigration.objects[0].objects).to.have.lengthOf(3);

    await migrations[1].up({ space });
    const afterMigration = await query.run();
    expect(afterMigration.objects).to.have.lengthOf(1);
    expect(afterMigration.objects[0].name).to.equal('');
    expect(afterMigration.objects[0].objects).to.have.lengthOf(9);
    expect(getSpaceProperty(space, FolderType.typename)).to.equal(afterMigration.objects[0]);
  });
});
