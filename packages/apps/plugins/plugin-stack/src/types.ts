//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { FC } from 'react';

import { type SchemaProvides } from '@braneframe/plugin-client';
import type {
  GraphBuilderProvides,
  Intent,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { STACK_PLUGIN } from './meta';

const STACK_ACTION = `${STACK_PLUGIN}/action`;
export enum StackAction {
  CREATE = `${STACK_ACTION}/create`,
}

// TODO(wittjosiah): Creators/choosers likely aren't stack-specific.
//   Also distinct from graph actions though, output should be inserted into current view rather than navigated to.
type StackSectionAction = {
  id: string;
  testId: string;
  label: string | [string, { ns: string }];
  icon: FC<IconProps>;
};

export type StackSectionCreator = StackSectionAction & {
  intent: Intent | Intent[];
};

export type StackProvides = {
  stack: {
    creators?: StackSectionCreator[];
  };
};

export type StackState = {
  creators: StackSectionCreator[];
};

export type StackSettingsProps = { separation: boolean };

export type StackPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<StackSettingsProps> &
  TranslationsProvides &
  SchemaProvides & { stack: StackState };
