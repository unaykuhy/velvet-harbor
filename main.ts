import * as filesystem from 'node:fs';
import * as paths from 'node:path';
import { fileURLToPath as localPath } from 'node:url';
import { buildDossier as describeGame } from './vendor/makefun-game.ts';

// Publish only the playable waterfront and the three unedited browser captures.
const repository = localPath(new URL('.', import.meta.url));
const destination = paths.resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
filesystem.mkdirSync(destination, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  filesystem.cpSync(paths.join(repository, folder), paths.join(destination, folder), { recursive: true });
}
const limits = {
  game_max_bytes: 48 * 1024 * 1024,
  game_max_files: 993,
  game_path_max_bytes: 1000,
  screenshots: { max_bytes: 256 * 1024, max: 4 },
  text_max_bytes: 160 * 1024,
};
const dossier = describeGame(destination, limits);
filesystem.writeFileSync(paths.join(destination, 'dossier.json'), dossier);
