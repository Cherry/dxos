//
// Copyright 2023 DXOS.org
//

import { z } from 'zod';

import { type IntentData } from '../IntentPlugin';
import type { Plugin } from '../PluginHost';

//
// Provides
//

/**
 * Basic state provided by a layout plugin.
 */
// TODO(burdon): Josiah: why do we use zod here?
export const Layout = z.object({
  fullscreen: z.boolean(),
  sidebarOpen: z.boolean(),
  complementarySidebarOpen: z.boolean(),

  // TODO(burdon): Why do we have a single root?
  dialogOpen: z.boolean(),
  dialogContent: z.any().optional().describe('Data to be passed to the dialog Surface.'),

  popoverOpen: z.boolean(),
  popoverContent: z.any().optional().describe('Data to be passed to the popover Surface.'),
  popoverAnchorId: z.string().optional(),

  // TODO(wittjosiah): Array?
  active: z.string().optional().describe('Id of the currently active item.'),
  // TODO(wittjosiah): History?
  previous: z.string().optional(),
});

export type Layout = z.infer<typeof Layout>;

/**
 * Provides for a plugin that can manage the app layout.
 */
export type LayoutProvides = {
  layout: Readonly<Layout>;
};

/**
 * Type guard for layout plugins.
 */
export const parseLayoutPlugin = (plugin: Plugin) => {
  const { success } = Layout.safeParse((plugin.provides as any).layout);
  return success ? (plugin as Plugin<LayoutProvides>) : undefined;
};

//
// Intents
//

const LAYOUT_ACTION = 'dxos.org/plugin/layout';
// TODO(wittjosiah): Consider consolidating some action types (e.g. toggle).
export enum LayoutAction {
  TOGGLE_FULLSCREEN = `${LAYOUT_ACTION}/toggle-fullscreen`,
  TOGGLE_SIDEBAR = `${LAYOUT_ACTION}/toggle-sidebar`,
  TOGGLE_COMPLEMENTARY_SIDEBAR = `${LAYOUT_ACTION}/toggle-complementary-sidebar`,
  OPEN_DIALOG = `${LAYOUT_ACTION}/open-dialog`,
  CLOSE_DIALOG = `${LAYOUT_ACTION}/close-dialog`,
  OPEN_POPOVER = `${LAYOUT_ACTION}/open-popover`,
  CLOSE_POPOVER = `${LAYOUT_ACTION}/close-popover`,
  ACTIVATE = `${LAYOUT_ACTION}/activate`,
  FOCUS = `${LAYOUT_ACTION}/focus`,
}

/**
 * Expected payload for layout actions.
 */
export namespace LayoutAction {
  export type ToggleFullscreen = IntentData<{
    state?: boolean;
  }>;

  export type ToggleSidebar = IntentData<{
    state?: boolean;
  }>;

  export type ToggleComplementarySidebar = IntentData<{
    state?: boolean;
  }>;

  export type OpenDialog = IntentData<{
    component: string;
    subject: any;
  }>;

  export type CloseDialog = IntentData<{}>;

  export type OpenPopover = IntentData<{
    anchorId: string;
    component: string;
    subject: any;
  }>;

  export type ClosePopover = IntentData<{}>;

  export type Activate = IntentData<{
    id: string;
  }>;
}
