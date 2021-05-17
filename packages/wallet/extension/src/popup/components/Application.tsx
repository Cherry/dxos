//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';
import { hot } from 'react-hot-loader';

import { JsonTreeView } from '@dxos/react-ux';

import { useBackground } from '../hooks';

const Application = () => {
  const [profile, setProfile] = useState<any | undefined>();
  const background = useBackground();

  useEffect(() => {
    if (background === undefined) {
      return;
    }

    const listener = (message: any) => {
      console.log('Popup received: ', message);
      if (message?.method === 'ResponseProfile') {
        setProfile(message.data);
      }
    };
    background.onMessage.addListener(listener);
    background.postMessage({ method: 'GetProfile' });
    return () => background.onMessage.removeListener(listener);
  }, [background]);

  if (!profile) {
    return <p>No profile loaded.</p>;
  }

  return (
    <div style={{ minWidth: 400 }}>
      <JsonTreeView data={profile} />
    </div>
  );
};

export default hot(module)(Application);
