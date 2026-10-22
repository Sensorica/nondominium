import type {
  LifecycleStage,
  NdoDescriptor,
  PropertyRegime,
  ResourceNature
} from '@nondominium/shared-types';

export interface ActiveFilters {
  stages: LifecycleStage[];
  natures: ResourceNature[];
  regimes: PropertyRegime[];
}

/** OR within a filter group, AND across groups; an empty group does not filter. */
export function applyFilters(all: NdoDescriptor[], filters: ActiveFilters): NdoDescriptor[] {
  const { stages, natures, regimes } = filters;
  const noFilter = stages.length === 0 && natures.length === 0 && regimes.length === 0;
  if (noFilter) return all;
  return all.filter((d) => {
    const stageOk = stages.length === 0 || (d.lifecycle_stage !== null && stages.includes(d.lifecycle_stage as LifecycleStage));
    const natureOk = natures.length === 0 || (d.resource_nature !== null && natures.includes(d.resource_nature as ResourceNature));
    const regimeOk = regimes.length === 0 || (d.property_regime !== null && regimes.includes(d.property_regime as PropertyRegime));
    return stageOk && natureOk && regimeOk;
  });
}
