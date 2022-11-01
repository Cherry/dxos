//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';

export type WriteReceipt = {
  feedKey: PublicKey;
  seq: number;
};

export interface FeedWriter<T extends {}> {
  write(data: T): Promise<WriteReceipt>;
}

export const createFeedWriter = <T extends {}>(cb: (data: T) => Promise<WriteReceipt>): FeedWriter<T> => ({
  write: async (data: T) => {
    return cb(data);
  }
});

export const writeMessages = <T extends {}>(writer: FeedWriter<T>, messages: T[]): Promise<WriteReceipt[]> =>
  Promise.all(messages.map((message) => writer.write(message)));
