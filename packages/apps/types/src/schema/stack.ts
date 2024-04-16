//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';

export class SectionType extends TypedObject({ typename: 'braneframe.Stack.Section', version: '0.1.0' })({
  object: E.ref(E.Expando),
}) {}

export class StackType extends TypedObject({ typename: 'braneframe.Stack', version: '0.1.0' })({
  title: S.optional(S.string),
  sections: S.mutable(S.array(E.ref(SectionType))),
}) {}
