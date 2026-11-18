import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import openGraphImages from '../../../public/images/__auto-generated/open-graph/images.json';

describe('open graph images list', () => {
  it('matches the generated images, so the bridge page never links to a missing one', () => {
    const images = fs
      .readdirSync(path.resolve(__dirname, '../../../public/images/__auto-generated/open-graph'))
      .filter((file) => file.endsWith('.jpg'))
      .sort();

    expect(openGraphImages).toEqual(images);
  });
});
