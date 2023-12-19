//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { sleep } from '@dxos/async';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { afterTest, describe, test } from '@dxos/test';

import { AutomergeObject } from './automerge';
import { TextObject, TypedObject, setGlobalAutomergePreference } from './object';
import { type SerializedSpace, Serializer } from './serializer';
import { createDatabase, testWithAutomerge } from './testing';

describe('Serializer', () => {
  testWithAutomerge(() => {
    test('Basic', async () => {
      const serializer = new Serializer();

      let data: SerializedSpace;

      {
        const { db } = await createDatabase();
        const obj = new TypedObject();
        obj.title = 'Test';
        db.add(obj);
        await db.flush();
        expect(db.objects).to.have.length(1);

        data = await serializer.export(db);
        expect(data.objects).to.have.length(1);
        expect(data.objects[0]).to.deep.include({
          '@id': obj.id,
          '@meta': { keys: [] },
          title: 'Test',
        });
      }

      {
        const { db } = await createDatabase();
        await serializer.import(db, data);

        const { objects } = db.query();
        expect(objects).to.have.length(1);
        expect(objects[0].title).to.eq('Test');
      }
    });

    test('Array of nested objects', async () => {
      const serializer = new Serializer();

      let serialized: SerializedSpace;

      {
        const { db } = await createDatabase();
        const obj = new TypedObject({
          title: 'Main task',
          subtasks: [
            new TypedObject({
              title: 'Subtask 1',
            }),
            new TypedObject({
              title: 'Subtask 2',
            }),
          ],
        });
        db.add(obj);
        await db.flush();

        await sleep(100);

        expect(db.objects).to.have.length(3);

        serialized = await serializer.export(db);
        expect(serialized.objects).to.have.length(3);
      }

      {
        const { db } = await createDatabase();
        await serializer.import(db, serialized);

        const { objects } = db.query();
        expect(objects).to.have.length(3);
        const main = objects.find((object) => object.title === 'Main task')!;
        expect(main).to.exist;
        expect(main.subtasks).to.have.length(2);
        expect(main.subtasks[0]).to.be.instanceOf(TypedObject);
        expect(main.subtasks[0].title).to.eq('Subtask 1');
        expect(main.subtasks[1]).to.be.instanceOf(TypedObject);
        expect(main.subtasks[1].title).to.eq('Subtask 2');
      }
    });
  });

  test('Text', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;
    const content = 'Hello world!';
    {
      const { db } = await createDatabase();
      const text = new TextObject(content);
      db.add(text);
      await db.flush();
      expect(text.text).to.deep.eq(content);
      expect(db.objects).to.have.length(1);

      data = await serializer.export(db);
      expect(data.objects).to.have.length(1);
      expect(data.objects[0]).to.deep.eq({
        '@id': text.id,
        '@model': 'dxos.org/model/text',
        '@type': 'dxos.Text.v0',
        content,
        kind: TextKind.PLAIN,
        field: 'content',
      });
    }

    {
      const { db } = await createDatabase();
      await serializer.import(db, data);

      const { objects } = db.query(undefined, { models: ['*'] });
      expect(objects[0] instanceof TextObject).to.be.true;
      expect(objects).to.have.length(1);
      expect(objects[0].text).to.deep.eq(content);
    }
  });
  // TODO(burdon): Create typed tests in echo-typegen.
});

describe('Serializer from Hypergraph to Automerge', () => {
  test('transfer text to automerge', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;
    const content = 'Hello world!';

    {
      const { db } = await createDatabase();
      const text = new TextObject(content, undefined, undefined, { useAutomergeBackend: false });
      db.add(text);
      await db.flush();
      expect(text.text).to.deep.eq(content);
      expect(db.objects).to.have.length(1);

      data = await serializer.export(db);
      expect(data.objects).to.have.length(1);
      expect(data.objects[0]).to.deep.eq({
        '@id': text.id,
        '@model': 'dxos.org/model/text',
        '@type': 'dxos.Text.v0',
        content,
        kind: TextKind.PLAIN,
        field: 'content',
      });
    }

    {
      setGlobalAutomergePreference(true);
      afterTest(() => setGlobalAutomergePreference(false));
      const { db } = await createDatabase();
      await serializer.import(db, data);

      const { objects } = db.query();
      expect(objects[0] instanceof AutomergeObject).to.be.true;
      expect(objects).to.have.length(1);
      expect(objects[0][objects[0].field]).to.deep.eq(content);
    }
  });

  test('transfer object to automerge', async () => {
    const serializer = new Serializer();

    let serialized: SerializedSpace;

    {
      const { db } = await createDatabase();
      const obj = new TypedObject(
        {
          title: 'Main task',
          subtasks: [
            new TypedObject({
              title: 'Subtask 1',
            }),
            new TypedObject({
              title: 'Subtask 2',
            }),
          ],
        },
        // { useAutomergeBackend: false },
      );
      db.add(obj);
      await db.flush();

      await sleep(100);

      expect(db.objects).to.have.length(3);

      serialized = await serializer.export(db);
      expect(serialized.objects).to.have.length(3);
    }

    {
      setGlobalAutomergePreference(true);
      afterTest(() => setGlobalAutomergePreference(false));
      const { db } = await createDatabase();
      await serializer.import(db, serialized);

      const { objects } = db.query();
      expect(objects).to.have.length(3);
      const main = objects.find((object) => object.title === 'Main task')!;
      expect(main).to.exist;
      expect(main.subtasks).to.have.length(2);
      expect(main.subtasks[0]).to.be.instanceOf(TypedObject);
      expect(main.subtasks[0].title).to.eq('Subtask 1');
      expect(main.subtasks[1]).to.be.instanceOf(TypedObject);
      expect(main.subtasks[1].title).to.eq('Subtask 2');
    }
  });
});
