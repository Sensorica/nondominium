import { describe, expect, test } from 'bun:test';
import type { RuleData } from '@nondominium/shared-types';
import {
  appliedTemplateIdsFromRules,
  mapTemplateToRuleData,
  ruleMatchesTemplate
} from './governance-template-map';

describe('ruleMatchesTemplate / appliedTemplateIdsFromRules', () => {
  test('matches exact mapped AccessRequirement templates', () => {
    const accountable = mapTemplateToRuleData('access_accountable')!.rule_data;
    const free = mapTemplateToRuleData('access_attribution')!.rule_data;
    expect(ruleMatchesTemplate(accountable, 'access_accountable')).toBe(true);
    expect(ruleMatchesTemplate(accountable, 'access_attribution')).toBe(false);
    expect(ruleMatchesTemplate(free, 'access_attribution')).toBe(true);
  });

  test('matches UsageLimit by characteristic field even when values differ', () => {
    const customized: RuleData = {
      UsageLimit: { max_concurrent_users: 12 }
    };
    expect(ruleMatchesTemplate(customized, 'capacity_limit')).toBe(true);
    expect(ruleMatchesTemplate(customized, 'quota_extraction')).toBe(false);
    expect(ruleMatchesTemplate(customized, 'max_per_agent')).toBe(false);
  });

  test('appliedTemplateIdsFromRules lists each covered template once', () => {
    const rules: RuleData[] = [
      mapTemplateToRuleData('access_accountable')!.rule_data,
      mapTemplateToRuleData('maintenance_schedule')!.rule_data,
      mapTemplateToRuleData('access_accountable')!.rule_data
    ];
    expect(appliedTemplateIdsFromRules(rules).sort()).toEqual(
      ['access_accountable', 'maintenance_schedule'].sort()
    );
  });
});
