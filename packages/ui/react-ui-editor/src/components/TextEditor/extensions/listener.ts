//
// Copyright 2023 DXOS.org
//

import { StateField } from '@codemirror/state';

export type ListenerOptions = { onChange: (text: string) => void };

/**
 * Based on https://github.com/codemirror/dev/issues/44#issuecomment-789093799
 */
// TODO(burdon): Expose options.
export const listener = ({ onChange }: ListenerOptions) =>
  StateField.define({
    create: () => null,
    update: (_value, transaction) => {
      if (transaction.docChanged && onChange) {
        onChange(transaction.newDoc.toString());
      }

      return null;
    },
  });
