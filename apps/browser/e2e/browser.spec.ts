import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  completeBrowserProfile,
  createDefaultBrowserProfile,
  summarizeBrowserProfile,
} from '../src/shared/profile';

const ARTICLE_URL = 'http://127.0.0.1:4173/cluttered-article.html';
const FORM_URL = 'http://127.0.0.1:4173/complex-form.html';
const PROCESS_ENV = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  ),
);

async function seedProfile(userData: string): Promise<void> {
  const profile = createDefaultBrowserProfile(
    '2026-07-24T00:00:00.000Z',
    'e2e-profile',
  );
  profile.preferences.informationDensity = 'calm';
  const completed = completeBrowserProfile(
    profile,
    summarizeBrowserProfile(profile),
    '2026-07-24T00:00:01.000Z',
  );
  const directory = join(userData, 'aura');
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, 'profile.json'),
    `${JSON.stringify(completed, null, 2)}\n`,
    'utf8',
  );
}

test('rehearses clean launch through Learn Me, Talk, Remember, and Original', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'aura-browser-clean-e2e-'));
  const app = await electron.launch({
    args: [resolve('.vite/main/index.js')],
    env: {
      ...PROCESS_ENV,
      AURA_START_URL: ARTICLE_URL,
      AURA_USER_DATA_DIR: userData,
      OPENAI_API_KEY: '',
    },
  });
  try {
    const shell = await app.firstWindow();
    await expect(
      shell.getByRole('heading', { name: 'Let’s find your comfortable web.' }),
    ).toBeVisible();
    await shell.getByRole('button', { name: 'Find my comfort' }).click();
    await shell.getByRole('button', { name: /Comfortable A little larger/ }).click();
    await shell.getByRole('button', { name: 'Continue' }).click();
    await shell.getByRole('button', { name: /Comfortable 52-pixel/ }).click();
    await shell.getByRole('button', { name: 'Continue' }).click();
    await shell.getByRole('button', { name: /Calmer Reduce motion/ }).click();
    await shell.getByRole('button', { name: 'Continue' }).click();
    await shell.getByRole('button', { name: /Concise Short/ }).click();
    await shell.getByRole('button', { name: 'Continue' }).click();
    await shell.getByRole('button', { name: 'Start browsing' }).click();

    await expect(shell.getByRole('button', { name: 'Make This Mine' })).toBeEnabled({
      timeout: 20_000,
    });
    await shell.getByRole('button', { name: 'Make This Mine' }).click();
    await expect(shell.getByRole('button', { name: 'Original' })).toBeVisible();

    const message = shell.getByRole('textbox', { name: 'Ask or tell AURA' });
    await message.fill('The page is too distracting.');
    await message.press('Enter');
    await expect(
      shell.getByText('I adjusted the current AURA presentation.'),
    ).toBeVisible();
    await message.fill('Remember that I prefer calm pages.');
    await message.press('Enter');
    await expect(shell.getByText('Remember this preference?')).toBeVisible();
    await shell.getByRole('button', { name: 'Remember', exact: true }).click();
    await shell.getByRole('button', { name: 'Original' }).click();
    await expect(
      shell.getByText('The original presentation is restored.'),
    ).toBeVisible();

    await shell.addScriptTag({
      path: resolve('../extension/node_modules/axe-core/axe.min.js'),
    });
    const seriousViolations = await shell.evaluate(async () => {
      const axe = (
        globalThis as typeof globalThis & {
          axe: {
            run: () => Promise<{
              violations: Array<{
                id: string;
                impact: string | null;
              }>;
            }>;
          };
        }
      ).axe;
      const result = await axe.run();
      return result.violations.filter(
        (violation) =>
          violation.impact === 'critical' || violation.impact === 'serious',
      );
    });
    expect(seriousViolations).toEqual([]);
  } finally {
    await app.close();
    await rm(userData, { force: true, recursive: true });
  }
});

test('runs Make This Mine, conversation, memory, navigation, and Original in Electron', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'aura-browser-e2e-'));
  await seedProfile(userData);
  const app = await electron.launch({
    args: [resolve('.vite/main/index.js')],
    env: {
      ...PROCESS_ENV,
      AURA_START_URL: ARTICLE_URL,
      AURA_USER_DATA_DIR: userData,
      OPENAI_API_KEY: '',
    },
  });

  try {
    const shell = await app.firstWindow();
    await expect(shell.getByRole('heading', { name: 'Ready for this page.' })).toBeVisible();
    await expect(shell.getByRole('button', { name: 'Make This Mine' })).toBeEnabled({
      timeout: 20_000,
    });
    await shell.getByRole('button', { name: 'Make This Mine' }).click();
    await expect(shell.getByRole('button', { name: 'Original' })).toBeVisible();

    const remote = app
      .context()
      .pages()
      .find((page) => page.url().startsWith(ARTICLE_URL));
    expect(remote).toBeDefined();
    await expect
      .poll(() =>
        remote?.evaluate(
          () =>
            document.documentElement.getAttribute('data-aura-presentation'),
        ),
      )
      .toBe('on');

    const message = shell.getByRole('textbox', { name: 'Ask or tell AURA' });
    await message.fill('These controls still feel too small.');
    await message.press('Enter');
    await expect(
      shell.getByText('I adjusted the current AURA presentation.'),
    ).toBeVisible();

    await message.fill('Help me complete this form.');
    await message.press('Enter');
    await expect(shell.getByText(/Goal:/)).toBeVisible();

    const address = shell.getByRole('textbox', {
      name: 'Search or enter address',
    });
    await address.fill(FORM_URL);
    await address.press('Enter');
    await expect(shell.getByText(/Goal:/)).toBeVisible();
    await expect(shell.getByRole('button', { name: 'Make This Mine' })).toBeEnabled({
      timeout: 20_000,
    });

    await message.fill('Remember that I prefer short explanations.');
    await message.press('Enter');
    await expect(shell.getByText('Remember this preference?')).toBeVisible();
    await shell.getByRole('button', { name: 'Remember', exact: true }).click();
    await expect(
      shell.getByText('Remembered. I’ll use that preference on later pages.'),
    ).toBeVisible();

    await shell.getByRole('button', { name: 'Make This Mine' }).click();
    await expect(shell.getByRole('button', { name: 'Original' })).toBeVisible();
    await shell.getByRole('button', { name: 'Original' }).click();
    const formRemote = app
      .context()
      .pages()
      .find((page) => page.url().startsWith(FORM_URL));
    expect(formRemote).toBeDefined();
    await expect
      .poll(() =>
        formRemote?.evaluate(
          () =>
            document.documentElement.hasAttribute('data-aura-presentation'),
        ),
      )
      .toBe(false);
  } finally {
    await app.close();
  }

  const relaunched = await electron.launch({
    args: [resolve('.vite/main/index.js')],
    env: {
      ...PROCESS_ENV,
      AURA_START_URL: ARTICLE_URL,
      AURA_USER_DATA_DIR: userData,
      OPENAI_API_KEY: '',
    },
  });
  try {
    const shell = await relaunched.firstWindow();
    await shell.getByText('What AURA remembers').click();
    await expect(
      shell.getByRole('textbox', { name: 'Preference 1' }),
    ).toHaveValue('I prefer short explanations.');
  } finally {
    await relaunched.close();
    await rm(userData, { force: true, recursive: true });
  }
});
