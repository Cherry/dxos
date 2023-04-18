//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Presentation } from '@dxos/kai-types';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { TestFrameContainer } from '../../testing';
import { PresenterFrame } from './PresenterFrame';
import { PresenterFrameRuntime } from './defs';

import '@dxosTheme';

export default {
  component: PresenterFrame,
  parameters: {
    layout: 'fullscreen'
  }
};

// TODO(burdon): Decorator to enable bots to auto-join (fixed topic).

export const Default = {
  decorators: [ClientSpaceDecorator()],
  render: () => (
    <TestFrameContainer<Presentation> onCreate={PresenterFrameRuntime.onCreate!}>
      <PresenterFrame />
    </TestFrameContainer>
  )
};

export const Deck = {
  decorators: [ClientSpaceDecorator()],
  render: () => (
    <TestFrameContainer<Presentation> onCreate={PresenterFrameRuntime.onCreate!} state={{ fullscreen: true }}>
      <PresenterFrame />
    </TestFrameContainer>
  )
};
