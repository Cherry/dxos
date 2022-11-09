//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { invitationObservable } from '@dxos/client';
import { useClient } from '@dxos/react-client';

import { JoinDialog, JoinDialogProps } from './JoinDialog';

export interface JoinHaloDialogProps extends Omit<JoinDialogProps, 'onJoin' | 'title'> {
  onJoin?: () => Promise<void> | void;
}

/**
 * Manages the workflow of joining a HALO invitation.
 */
export const JoinHaloDialog = ({ onJoin, ...props }: JoinHaloDialogProps) => {
  const client = useClient();

  const handleJoin: JoinDialogProps['onJoin'] = async ({ invitation, secretProvider }) => {
    const observable = await client.halo.acceptInvitation(invitation);
    await invitationObservable(observable);
    // const secret = await secretProvider();
    // await acceptedInvitation.authenticate(secret);
    await onJoin?.();
  };

  return <JoinDialog {...props} title='Join Halo' onJoin={handleJoin} />;
};
