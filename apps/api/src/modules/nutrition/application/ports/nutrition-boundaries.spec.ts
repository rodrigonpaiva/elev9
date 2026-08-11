import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryImportPattern =
  /nutrition-(?:profile|plan|log|recommendation)\.repository/;
const forbiddenRawImportPattern =
  /(?:nutrition-profile\.entity|nutrition-plan\.entity|nutrition-log\.entity|nutrition-recommendation\.entity|mongoose-nutrition)/;
const forbiddenRuntimeFields = [
  'nutritionProfile',
  'nutritionPlan',
  'nutritionLogs',
  'rawNutrition',
  'legacyNutrition',
  'nutritionRecommendations',
];
const consumerRoots = [
  'apps/api/src/modules/ai',
  'apps/api/src/modules/training',
  'apps/api/src/modules/goals',
  'apps/api/src/modules/notifications',
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = join(directory, entry);
    if (statSync(filePath).isDirectory()) return sourceFiles(filePath);
    return filePath.endsWith('.ts') && !filePath.endsWith('.spec.ts')
      ? [filePath]
      : [];
  });
}

describe('Nutrition application boundaries', () => {
  it('keeps Nutrition persistence imports inside the Nutrition module', () => {
    const workspaceRoot = resolve(__dirname, '../../../../../../..');
    const violations = consumerRoots.flatMap((relativeRoot) =>
      sourceFiles(join(workspaceRoot, relativeRoot)).filter((filePath) =>
        repositoryImportPattern.test(readFileSync(filePath, 'utf8')),
      ),
    );

    expect(violations).toEqual([]);
  });

  it('keeps raw Nutrition contracts out of consumer runtime paths', () => {
    const workspaceRoot = resolve(__dirname, '../../../../../../..');
    const violations = consumerRoots.flatMap((relativeRoot) =>
      sourceFiles(join(workspaceRoot, relativeRoot)).flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        const matches: string[] = [];
        if (forbiddenRawImportPattern.test(source))
          matches.push(`${filePath}:raw-import`);
        for (const field of forbiddenRuntimeFields) {
          if (new RegExp(`\\b${field}\\s*:`).test(source))
            matches.push(`${filePath}:${field}`);
        }
        return matches;
      }),
    );
    expect(violations).toEqual([]);
  });

  it('allows TodayNutrition only in the explicit compatibility type boundary', () => {
    const workspaceRoot = resolve(__dirname, '../../../../../../..');
    const files = sourceFiles(join(workspaceRoot, 'apps')).concat(
      sourceFiles(join(workspaceRoot, 'packages')),
    );
    const violations = files.filter((filePath) => {
      if (
        filePath.endsWith('packages/types/src/nutrition/index.ts') ||
        filePath.endsWith('packages/types/src/nutrition/index.d.ts')
      )
        return false;
      return /\bTodayNutrition\b/.test(readFileSync(filePath, 'utf8'));
    });
    expect(violations).toEqual([]);
  });
});
