//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { itemAdapter, TestType } from '@dxos/react-client-testing';
import { FullScreen } from '@dxos/react-components';

import { CreateItemDialog } from '../src';
import { CreateItemButton } from './helpers';

export default {
  title: 'KitchenSink/CreateItemDialog'
};

export const Primary = () => {
  return (
    <FullScreen>
      <CreateItemDialog
        open
        type={TestType.Org}
        itemAdapter={itemAdapter}
        onCreate={(title: string) => console.log(title)}
        onCancel={() => {}}
      />
    </FullScreen>
  );
};

export const Secondary = () => {
  const handleCreate = (type?: string, title?: string) => {
    console.log(type, title);
  };

  return (
    <FullScreen>
      <CreateItemButton
        onCreate={(type?: string, title?: string) => handleCreate(type, title)}
      />
    </FullScreen>
  );
};
