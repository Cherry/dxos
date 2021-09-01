//
// Copyright 2019 DXOS.org
//

import defaultHypercore from 'hypercore';
import pify from 'pify';

import { Lock } from '@dxos/async';
import { PublicKey, discoveryKey } from '@dxos/crypto';
import type { IFile, IStorage } from '@dxos/random-access-multi-storage';

import type { HypercoreFeed, Hypercore } from './hypercore-types';

interface ValueEncoding {
  encode: string,
  decode: string
}

interface FeedDescriptorOptions {
  storage: IStorage,
  key: PublicKey,
  secretKey?: Buffer,
  valueEncoding?: string | ValueEncoding,
  metadata?: any,
  codecs?: object,
  hypercore?: Hypercore
}

type Listener = ((...args: any) => Promise<void> | void) | null;

/**
 * FeedDescriptor
 *
 * Abstract handler for an Hypercore instance.
 */
export class FeedDescriptor {
  private _storage: IStorage;
  private _key: PublicKey;
  private _secretKey?: Buffer;
  private _valueEncoding?: string | ValueEncoding;
  private _hypercore: Hypercore;
  private _codecs: any;
  private _metadata: any;
  private _discoveryKey: Buffer;
  public readonly lock: Lock;
  private _feed: any;
  private _listener: Listener;

  constructor (options: FeedDescriptorOptions) {
    const {
      storage,
      key,
      secretKey,
      valueEncoding,
      hypercore = defaultHypercore,
      codecs = {},
      metadata
    } = options;

    this._storage = storage;
    this._valueEncoding = valueEncoding;
    this._hypercore = hypercore;
    this._codecs = codecs;
    this._metadata = metadata;
    this._key = key;
    this._secretKey = secretKey;

    this._discoveryKey = discoveryKey(this._key);

    this.lock = new Lock();

    this._feed = null;
    this._listener = null;
  }

  get feed (): HypercoreFeed | null {
    return this._feed;
  }

  get opened () {
    return !!(this._feed && this._feed.opened && !this._feed.closed);
  }

  get key () {
    return this._key;
  }

  get secretKey () {
    return this._secretKey;
  }

  get discoveryKey () {
    return this._discoveryKey;
  }

  get valueEncoding () {
    return this._valueEncoding;
  }

  get metadata () {
    return this._metadata;
  }

  async setMetadata (metadata: any) {
    this._metadata = metadata;
    await this._emit('updated');
  }

  /**
   * Open an Hypercore feed based on the related feed options.
   *
   * This is an atomic operation, FeedDescriptor makes
   * sure that the feed is not going to open again.
   */
  async open (): Promise<HypercoreFeed> {
    if (this.opened) {
      return this._feed;
    }

    await this.lock.executeSynchronized(async () => {
      await this._open();
      await this._emit('opened');
    });
    return this._feed;
  }

  /**
   * Close the Hypercore referenced by the descriptor.
   */
  async close () {
    if (!this.opened) {
      return;
    }

    await this.lock.executeSynchronized(async () => {
      await pify(this._feed.close.bind(this._feed))();
      await this._emit('closed');
    });
  }

  /**
   * Watch for descriptor events.
   *
   * @param {function} listener
   */
  watch (listener: Listener) {
    this._listener = listener;
  }

  /**
   * Defines the real path where the Hypercore is going
   * to work with the RandomAccessStorage specified.
   */
  private _createStorage (dir = ''): (name: string) => IFile {
    return (name) => {
      return this._storage.createOrOpen(`${dir}/${name}`);
    };
  }

  private async _open () {
    this._feed = this._hypercore(
      this._createStorage(this._key.toString()),
      this._key.asBuffer(),
      {
        secretKey: this._secretKey,
        valueEncoding: (typeof this._valueEncoding === 'string' && this._codecs[this._valueEncoding]) ||
          this._valueEncoding
      }
    );

    await pify(this._feed.ready.bind(this._feed))();
  }

  /**
   * Asynchronous emitter.
   */
  private async _emit (event: any, ...args: any) {
    if (this._listener) {
      await this._listener(event, ...args);
    }
  }
}

export default FeedDescriptor;
