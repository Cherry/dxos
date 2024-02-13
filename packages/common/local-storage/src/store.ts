//
// Copyright 2023 DXOS.org
//

import { type Signal } from '@preact/signals-core';
// NOTE: This needs to use the react entrypoint to be compatible with react-based plugins.
// The different deepsignal entrypoints are not compatible with each other.
// Each entrypoint has its own weakmap for tracking instances.
import { type DeepSignal, deepSignal } from 'deepsignal/react';

import type { UnsubscribeCallback } from '@dxos/async';

type PropType<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T | undefined) => void;
};

/**
 * Local storage backed store.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
 * DevTools > Application > Local Storage
 */
export class LocalStorageStore<T extends object> {
  static string: PropType<string | undefined> = {
    get: (key) => {
      const value = localStorage.getItem(key);
      return value === null ? undefined : value;
    },
    set: (key, value) => {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    },
  };

  static number: PropType<number | undefined> = {
    get: (key) => {
      const value = parseInt(localStorage.getItem(key) ?? '');
      return isNaN(value) ? undefined : value;
    },
    set: (key, value) => {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(value));
      }
    },
  };

  static bool: PropType<boolean | undefined> = {
    get: (key) => {
      const value = localStorage.getItem(key);
      return value === 'true' ? true : value === 'false' ? false : undefined;
    },
    set: (key, value) => {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(value));
      }
    },
  };

  static json: PropType<object | undefined> = {
    get: (key) => {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : undefined;
    },
    set: (key, value) => {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
  };

  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();

  public readonly values: DeepSignal<T>;

  constructor(
    private readonly _prefix: string,
    defaults?: T,
  ) {
    this.values = deepSignal<T>(defaults ?? ({} as T));
  }

  // TODO(burdon): Reset method (keep track of binders).

  /**
   * Binds signal property to local storage key.
   */
  prop<T>(prop: Signal<T>, lkey: string, type: PropType<T>) {
    const key = this._prefix + '/' + lkey;
    if (this._subscriptions.has(key)) {
      return this;
    }

    const current = type.get(key);
    if (current !== undefined) {
      prop.value = current;
    }

    // The subscribe callback is always called.
    this._subscriptions.set(
      key,
      prop.subscribe((value) => {
        const current = type.get(key);
        if (value !== current) {
          type.set(key, value);
        }
      }),
    );

    return this;
  }

  close() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
  }
}
