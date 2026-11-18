// Étape 9 : banques de sons supplémentaires, chargées à la demande.
import { expect, type Page, test } from '@playwright/test'

const erreurs: string[] = []

test.beforeEach(async ({ page }) => {
  erreurs.length = 0
  page.on('pageerror', (e) => erreurs.push(e.message))
  page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()))
  await page.goto('./')
  await expect(page.getByTestId('statut')).toHaveText('Prêt', { timeout: 30_000 })
})

test.afterEach(() => {
  expect(erreurs).toEqual([])
})

/** Crête du niveau général pendant `ms` après une note du canal sélectionné. */
async function crete(page: Page, velocite: number, ms = 600): Promise<number> {
  return page.evaluate(
    async ([v, duree]) => {
      const s = (window as any).__studio
      const e = s.etat()
      e.jouerNote(60, v)
      let max = 0
      const fin = performance.now() + duree
      while (performance.now() < fin) {
        max = Math.max(max, s.audio.moteur.niveau())
        await new Promise((r) => setTimeout(r, 10))
      }
      e.relacherNote(60)
      await new Promise((r) => setTimeout(r, 1500))
      return max
    },
    [velocite, ms] as const,
  )
}

test('le piano Salamander se charge quand un piano est utilisé, et passe devant General MIDI', async ({ page }) => {
  // un projet de batteries seulement, repris au rechargement : rien à télécharger
  await page.getByTestId('nouveau-projet').click()
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.getByTestId('statut')).toHaveText('Prêt', { timeout: 30_000 })
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => (window as any).__studio.etat().banques)).toEqual({})

  await page.locator('summary', { hasText: /^Pianos$/ }).click()
  await page.getByRole('button', { name: '＋ Piano à queue', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__studio.etat().banques.piano?.phase), { timeout: 60_000 }).toBe('prete')
  const banques = await page.evaluate(() => (window as any).__studio.audio.moteur.synth.soundBankManager.priorityOrder)
  expect(banques).toEqual(['piano', 'gm'])

  await page.getByTestId('lecture').click() // le son démarre au premier geste
  await page.getByTestId('lecture').click()
  const doux = await crete(page, 30)
  const fort = await crete(page, 120)
  console.log(`piano : doux ${doux.toFixed(4)}, fort ${fort.toFixed(4)}, rapport ${(fort / doux).toFixed(2)}`)
  expect(doux).toBeGreaterThan(0.002)
  expect(fort / doux).toBeGreaterThan(2)
  expect(fort / doux).toBeLessThan(20)
})
