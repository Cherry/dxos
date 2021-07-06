//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { AppBar, makeStyles, Toolbar, Typography } from '@material-ui/core';

import Main from './Main';

const useStyles = makeStyles({
  logo: {
    maxWidth: 20,
    margin: 5
  }
});

const Root = () => {
  const classes = useStyles();

  return (
    <>
      <AppBar position='static' color='default'>
        <Toolbar>
          <img src='../dxos.png' alt="logo" className={classes.logo} />
          <Typography variant='h6'> Welcome to DXOS! </Typography>
        </Toolbar>
      </AppBar>
      <Main/>
    </>
  );
};

export default Root;
