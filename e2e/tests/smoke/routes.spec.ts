import { test } from '@playwright/test';
import { smokeRoutes } from '../../lib/routes';
import { visitAndCheck } from '../../lib/stripes';

test.describe('route smoke', () => {
  for (const route of smokeRoutes) {
    test(`${route.name} renders`, async ({ page }) => {
      await visitAndCheck(page, route.path, route.landmark);
    });
  }
});
