//
// Copyright 2023 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { type DocumentId, type DocHandle, type DocHandleChangePayload } from '@dxos/automerge/automerge-repo';
import { Context, ContextDisposedError, cancelWithContext } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { type Reference } from '@dxos/document-model';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AutomergeContext } from './automerge-context';
import { AutomergeObject } from './automerge-object';
import { type DocStructure } from './types';
import { type Hypergraph } from '../hypergraph';
import { type EchoLegacyDatabase } from '../legacy-database';
import { type EchoObject, base, isActualTypedObject, isAutomergeObject, isActualTextObject } from '../object';
import { type Schema } from '../proto';

export type SpaceState = {
  // Url of the root automerge document.
  rootUrl?: string;
};

export class AutomergeDb {
  private _docHandle!: DocHandle<DocStructure>;

  /**
   * @internal
   */
  readonly _objects = new Map<string, AutomergeObject>();
  readonly _objectsSystem = new Map<string, EchoObject>();

  readonly _updateEvent = new Event<{ spaceKey: PublicKey; itemsUpdated: { id: string }[] }>();

  private _ctx?: Context = undefined;

  /**
   * @internal
   */
  readonly _echoDatabase: EchoLegacyDatabase;

  constructor(
    public readonly graph: Hypergraph,
    public readonly automerge: AutomergeContext,
    echoDatabase: EchoLegacyDatabase,
  ) {
    this._echoDatabase = echoDatabase;
  }

  get spaceKey() {
    return this._echoDatabase._backend.spaceKey;
  }

  @synchronized
  async open(spaceState: SpaceState) {
    const start = performance.now();
    if (this._ctx) {
      log.info('Already open');
      return;
    }
    this._ctx = new Context();

    if (!spaceState.rootUrl) {
      // TODO(dmaretskyi): Should be a critical error.
      log.error('Database opened with no rootUrl', { spaceKey: this.spaceKey });
      await this._fallbackToNewDoc();
    } else {
      try {
        this._docHandle = await this._initDocHandle(spaceState.rootUrl);

        const doc = this._docHandle.docSync();
        invariant(doc);

        const ojectIds = Object.keys(doc.objects ?? {});
        this._createObjects(ojectIds);
      } catch (err) {
        if (err instanceof ContextDisposedError) {
          return;
        }

        log.catch(err);
        throw err;
      }
    }

    const update = (event: DocHandleChangePayload<DocStructure>) => {
      const updatedObjects = getUpdatedObjects(event);
      const absentObjects = updatedObjects.filter((id) => !this._objects.has(id));
      absentObjects.length > 0 && this._createObjects(absentObjects);
      this._emitUpdateEvent(updatedObjects);
    };

    this._docHandle.on('change', update);
    this._ctx.onDispose(() => {
      this._docHandle.off('change', update);
    });

    const elapsed = performance.now() - start;
    if (elapsed > 1000) {
      log.warn('slow AM open', { docId: spaceState.rootUrl, duration: elapsed });
    }
  }

  // TODO(dmaretskyi): Cant close while opening.
  @synchronized
  async close() {
    if (!this._ctx) {
      return;
    }

    void this._ctx.dispose();
    this._ctx = undefined;
  }

  private async _initDocHandle(url: string) {
    const docHandle = this.automerge.repo.find(url as DocumentId);
    // Loop on timeout.
    while (true) {
      try {
        await warnAfterTimeout(5_000, 'Automerge root doc load timeout (AutomergeDb)', async () => {
          await cancelWithContext(this._ctx!, docHandle.whenReady(['ready'])); // TODO(dmaretskyi): Temporary 5s timeout for debugging.
        });
        break;
      } catch (err) {
        if (`${err}`.includes('Timeout')) {
          log.info('wraparound', { id: docHandle.documentId, state: docHandle.state });
          continue;
        }

        throw err;
      }
    }

    if (docHandle.state === 'unavailable') {
      throw new Error('Automerge document is unavailable');
    }

    return docHandle;
  }

  private async _fallbackToNewDoc() {
    this._docHandle = this.automerge.repo.create();
    this._ctx!.onDispose(() => {
      this._docHandle.delete();
    });
  }

  getObjectById(id: string): EchoObject | undefined {
    const obj = this._objects.get(id) ?? this._echoDatabase._objects.get(id);
    if (!obj) {
      return undefined;
    }

    if ((obj as any).__deleted === true) {
      return undefined;
    }

    return obj;
  }

  add<T extends EchoObject>(obj: T): T {
    if (isActualTypedObject(obj) || isActualTextObject(obj)) {
      return this._echoDatabase.add(obj);
    }

    if (obj[base]._database) {
      return obj;
    }

    invariant(isAutomergeObject(obj));
    invariant(!this._objects.has(obj.id));
    this._objects.set(obj.id, obj);
    (obj[base] as AutomergeObject)._bind({
      db: this,
      docHandle: this._docHandle,
      path: ['objects', obj.id],
      assignFromLocalState: true,
    });

    return obj;
  }

  remove<T extends EchoObject>(obj: T) {
    invariant(isAutomergeObject(obj));
    invariant(this._objects.has(obj.id));
    (obj[base] as AutomergeObject).__system!.deleted = true;
  }

  private _emitUpdateEvent(itemsUpdated: string[]) {
    this._updateEvent.emit({
      spaceKey: this.spaceKey,
      itemsUpdated: itemsUpdated.map((id) => ({ id })),
    });
    for (const id of itemsUpdated) {
      const obj = this._objects.get(id);
      if (obj) {
        obj[base]._core.notifyUpdate();
      }
    }
  }

  /**
   * @internal
   */
  _resolveSchema(type: Reference): Schema | undefined {
    if (type.protocol === 'protobuf') {
      return this.graph.types.getSchema(type.itemId);
    } else {
      // TODO(dmaretskyi): Cross-space references.
      return this.getObjectById(type.itemId) as Schema | undefined;
    }
  }

  /**
   * Loads all objects on open and handles objects that are being created not by this client.
   */
  private _createObjects(objectIds: string[]) {
    invariant(this._docHandle);
    for (const id of objectIds) {
      invariant(!this._objects.has(id));
      const obj = new AutomergeObject();
      obj[base]._core.id = id;
      this._objects.set(obj.id, obj);
      (obj[base] as AutomergeObject)._bind({
        db: this,
        docHandle: this._docHandle,
        path: ['objects', obj.id],
        assignFromLocalState: false,
      });
    }
  }
}

const getUpdatedObjects = (event: DocHandleChangePayload<DocStructure>): string[] => {
  const updatedObjects = event.patches
    .map(({ path }: { path: string[] }) => {
      if (path.length >= 2 && path[0] === 'objects') {
        return path[1];
      }
      return undefined;
    })
    .filter(Boolean);

  // Remove duplicates.
  return Array.from(new Set(updatedObjects)) as string[];
};
