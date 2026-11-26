/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BOMItem,
  EngineCatalogItem,
  EngineConfig,
  PartCustomOverride,
  PartFieldOverride,
  PartOverridesMap,
  PartSpecCategory,
  PartSpecMode,
  PartSystemId,
  TransmissionItem,
  VehicleItem
} from '../types/engine';
import {
  ARP_TORQUE_AND_STRETCH_SPECS,
  BASE_BOM,
  CAM_PROFILES,
  CYLINDER_HEAD_FLOW_BENCH,
  ENGINE_CATALOG,
  INTAKE_MANIFOLDS,
  MECHANIC_SPECS_LIBRARY,
  RAY_BASELINE_CONFIG,
  TRANSMISSIONS_DB,
  VEHICLES_CATALOG
} from './engineData';

export type PartInputType = 'number' | 'text' | 'select';

export interface PartFieldOption {
  value: string | number;
  label: string;
}

export interface PartFactoryContext {
  catalog: EngineCatalogItem | null;
  trans: TransmissionItem | null;
  vehicle: VehicleItem | null;
  config: EngineConfig;
}

export interface PartFactoryResolution {
  value: string | number | null;
  source: string | null;
}

export interface PartFieldDefinition {
  key: string;
  label: string;
  mode: PartSpecMode;
  category: PartSpecCategory;
  inputType: PartInputType;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  configKey?: keyof EngineConfig;
  transOverrideKey?: 'ratios' | 'reverse' | 'lengthInches';
  options?: PartFieldOption[];
  description?: string;
  getFactory: (ctx: PartFactoryContext) => PartFactoryResolution;
}

export interface PartSystemDefinition {
  id: PartSystemId;
  order: number;
  name: string;
  shortName: string;
  group: 'Core Engine' | 'Induction & Ignition' | 'Support Systems' | 'Powertrain';
  description: string;
  subassemblyKeys: string[];
  bomCategories: string[];
  fields: PartFieldDefinition[];
}

export interface EffectiveFieldState {
  field: PartFieldDefinition;
  factoryValue: string | number | null;
  factorySource: string | null;
  effectiveValue: string | number | '';
  isCustom: boolean;
  isMakerSupplied: boolean;
  override: PartFieldOverride | null;
}

export interface InspectorOverrideEntry {
  partId: PartSystemId;
  partName: string;
  fieldKey: string;
  label: string;
  value: string | number;
  unit?: string;
  factoryValue: string | number | null;
  mode: PartSpecMode;
  category: PartSpecCategory;
  makerSupplied: boolean;
  updatedAt: string;
}

export interface MergedBOMItem extends BOMItem {
  isCustom?: boolean;
  isMakerSupplied?: boolean;
  factoryPartNum?: string;
  customMaterial?: string;
  customNotes?: string;
  partId?: PartSystemId;
}

export const PART_OVERRIDES_STORAGE_KEY = 'sbc350_v10_part_overrides';
export const TRANS_OVERRIDES_STORAGE_KEY = 'sbc350_v10_trans_overrides';

const isSbc350Baseline = (catalog: EngineCatalogItem | null): boolean =>
  !catalog || catalog.id === 'sbc_350_ray';

const findTorqueSpec = (substr: string) =>
  ARP_TORQUE_AND_STRETCH_SPECS.find((t) =>
    t.item.toLowerCase().includes(substr.toLowerCase())
  );

const findMechanicSpec = (label: string) =>
  MECHANIC_SPECS_LIBRARY.find(
    (m) => m.label.toUpperCase() === label.toUpperCase()
  );

const findBomItem = (cat: string) =>
  BASE_BOM.find((b) => b.cat.toLowerCase() === cat.toLowerCase());

export const resolveActiveCatalogEngine = (
  config: EngineConfig,
  selectedEngineId?: string
): EngineCatalogItem => {
  if (selectedEngineId && ENGINE_CATALOG[selectedEngineId]) {
    return ENGINE_CATALOG[selectedEngineId];
  }
  const byExactGeometry = Object.values(ENGINE_CATALOG).find(
    (item) =>
      Math.abs(item.bore - config.bore) < 0.002 &&
      Math.abs(item.stroke - config.stroke) < 0.002 &&
      Math.abs(item.deckHeight - config.deckHeight) < 0.005 &&
      (item.cylinders ?? 8) === (config.cylinders ?? 8)
  );
  return byExactGeometry || ENGINE_CATALOG.sbc_350_ray;
};

export const getBaselineConfigForEngine = (
  catalog?: EngineCatalogItem | null
): EngineConfig => {
  if (!catalog || catalog.id === 'sbc_350_ray') {
    return { ...RAY_BASELINE_CONFIG, cylinders: 8 };
  }
  return {
    ...RAY_BASELINE_CONFIG,
    bore: catalog.bore,
    stroke: catalog.stroke,
    rodLength: catalog.rodLength,
    deckHeight: catalog.deckHeight,
    deckClearance: catalog.deckClearance,
    gasketThickness: catalog.gasketThickness,
    chamberCc: catalog.chamberCc,
    cylinders: catalog.cylinders ?? 8
  };
};

export const PART_SYSTEMS: PartSystemDefinition[] = [
  // 1. ENGINE BLOCK
  {
    id: 'engine_block',
    order: 1,
    name: 'Engine Block',
    shortName: 'Block',
    group: 'Core Engine',
    description:
      'Cylinder bore, deck geometry, head gasket stack, cylinder count, and main cap fasteners.',
    subassemblyKeys: ['block', 'timingCover'],
    bomCategories: ['Engine Block', 'Head Gaskets'],
    fields: [
      {
        key: 'bore',
        label: 'Cylinder Bore Diameter',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'in',
        min: 2.5,
        max: 4.75,
        step: 0.005,
        precision: 3,
        configKey: 'bore',
        description: 'Drives displacement, quench volume, static CR, and ring gap calculation.',
        getFactory: ({ catalog }) => ({
          value: catalog ? catalog.bore : RAY_BASELINE_CONFIG.bore,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'deckHeight',
        label: 'Block Deck Height',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'in',
        min: 7.5,
        max: 10.5,
        step: 0.005,
        precision: 3,
        configKey: 'deckHeight',
        description: 'Centerline of crank main bore to deck surface.',
        getFactory: ({ catalog }) => ({
          value: catalog ? catalog.deckHeight : RAY_BASELINE_CONFIG.deckHeight,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'deckClearance',
        label: 'Piston-to-Deck Clearance',
        mode: 'driving',
        category: 'clearance',
        inputType: 'number',
        unit: 'in',
        min: -0.02,
        max: 0.1,
        step: 0.001,
        precision: 3,
        configKey: 'deckClearance',
        description: 'Positive = piston below deck; negative = positive deck protrusion.',
        getFactory: ({ catalog }) => ({
          value: catalog ? catalog.deckClearance : RAY_BASELINE_CONFIG.deckClearance,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'gasketThickness',
        label: 'Head Gasket Compressed Thickness',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'in',
        min: 0.02,
        max: 0.09,
        step: 0.001,
        precision: 3,
        configKey: 'gasketThickness',
        description: 'Combined with deck clearance to compute quench distance and static CR.',
        getFactory: ({ catalog }) => ({
          value: catalog ? catalog.gasketThickness : RAY_BASELINE_CONFIG.gasketThickness,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'cylinders',
        label: 'Cylinder Count',
        mode: 'driving',
        category: 'dimension',
        inputType: 'select',
        configKey: 'cylinders',
        options: [
          { value: 4, label: '4 Cylinders' },
          { value: 6, label: '6 Cylinders' },
          { value: 8, label: '8 Cylinders' },
          { value: 10, label: '10 Cylinders' }
        ],
        getFactory: ({ catalog }) => ({
          value: catalog?.cylinders ?? 8,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'Default V8'
        })
      },
      {
        key: 'bellhousingPattern',
        label: 'Bellhousing Bolt Pattern',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        getFactory: ({ catalog }) => ({
          value: catalog?.pattern ?? null,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : null
        })
      },
      {
        key: 'mainCapTorqueInner',
        label: 'Main Bearing Cap Torque (Inner)',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Main Bearing Caps (Inner');
          return {
            value: spec ? `${spec.stock} (stock) / ${spec.arp}` : null,
            source: spec ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'mainCapTorqueOuter',
        label: 'Main Bearing Cap Torque (Outer Splayed)',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Main Bearing Caps (Outer');
          return {
            value: spec ? `${spec.stock} (stock) / ${spec.arp}` : null,
            source: spec ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'blockPartNumber',
        label: 'Block Casting / Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Engine Block');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'headGasketPartNumber',
        label: 'Head Gasket Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Head Gaskets');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'blockMaterial',
        label: 'Block Casting Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied alloy / casting',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'mainBearingClearance',
        label: 'Main Bearing Oil Clearance',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied clearance (e.g. 0.0022" - 0.0028")',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 2. CYLINDER HEADS
  {
    id: 'cylinder_heads',
    order: 2,
    name: 'Cylinder Heads',
    shortName: 'Heads',
    group: 'Core Engine',
    description:
      'Combustion chamber volume, flow bench specs, 17-bolt head torque, and casting details.',
    subassemblyKeys: ['heads'],
    bomCategories: ['Cylinder Heads'],
    fields: [
      {
        key: 'chamberCc',
        label: 'Combustion Chamber Volume',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'cc',
        min: 30,
        max: 150,
        step: 0.5,
        precision: 1,
        configKey: 'chamberCc',
        description: 'Drives static & dynamic compression ratios.',
        getFactory: ({ catalog }) => ({
          value: catalog ? catalog.chamberCc : RAY_BASELINE_CONFIG.chamberCc,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'flowBench500',
        label: 'Flow Bench @ 0.500" Lift',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied CFM flow spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const p500 = CYLINDER_HEAD_FLOW_BENCH.find((p) => Math.abs(p.lift - 0.5) < 0.001);
          return {
            value: p500
              ? `${p500.intakeCfm} CFM Intake / ${p500.exhaustCfm} CFM Exhaust @ 0.500"`
              : null,
            source: p500 ? 'CYLINDER_HEAD_FLOW_BENCH' : null
          };
        }
      },
      {
        key: 'headBoltTorque',
        label: 'Cylinder Head Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque sequence',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Cylinder Head Bolts');
          return {
            value: spec ? `${spec.stock} (stock) / ${spec.arp}` : null,
            source: spec ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'headPartNumber',
        label: 'Cylinder Head Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Cylinder Heads');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'headMaterial',
        label: 'Cylinder Head Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Cylinder Heads');
          if (bom && bom.part.toLowerCase().includes('aluminum')) {
            return { value: 'Aluminum (Edelbrock E-Street)', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'intakeRunnerCc',
        label: 'Intake Port Runner Volume',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied head runner cc',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'valveGuideClearance',
        label: 'Valve Stem-to-Guide Clearance',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied clearance',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 3. CRANKSHAFT
  {
    id: 'crankshaft',
    order: 3,
    name: 'Crankshaft',
    shortName: 'Crankshaft',
    group: 'Core Engine',
    description:
      'Stroke length, balance spec, end play, harmonic balancer/flywheel torques, and forging.',
    subassemblyKeys: ['crank'],
    bomCategories: ['Crankshaft'],
    fields: [
      {
        key: 'stroke',
        label: 'Crankshaft Stroke',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'in',
        min: 2.4,
        max: 4.75,
        step: 0.005,
        precision: 3,
        configKey: 'stroke',
        description: 'Drives displacement, rod/stroke ratio, rod angularity, and piston speed.',
        getFactory: ({ catalog }) => ({
          value: catalog ? catalog.stroke : RAY_BASELINE_CONFIG.stroke,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'balanceType',
        label: 'Crankshaft Balance Spec',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        getFactory: ({ catalog }) => ({
          value: catalog?.balance ?? null,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : null
        })
      },
      {
        key: 'crankEndPlay',
        label: 'Crankshaft Thrust End Play',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied end play spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('CRANKSHAFT END PLAY');
          return {
            value: spec ? spec.value : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'balancerBoltTorque',
        label: 'Harmonic Balancer Snout Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Harmonic Balancer');
          return {
            value: spec ? `${spec.stock} (stock) / ${spec.arp}` : null,
            source: spec ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'flywheelBoltTorque',
        label: 'Flywheel / Flexplate Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Flywheel / Flexplate');
          return {
            value: spec ? `${spec.stock} (stock) / ${spec.arp}` : null,
            source: spec ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'crankPartNumber',
        label: 'Crankshaft Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Crankshaft');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'crankMaterial',
        label: 'Crankshaft Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied metallurgy',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Crankshaft');
          if (bom && bom.part.includes('Forged 4340 Steel')) {
            return { value: 'Forged 4340 Steel', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'mainJournalDiameter',
        label: 'Main / Rod Journal Spec & Clearances',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied journal OD & oil clearance',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 4. CONNECTING RODS
  {
    id: 'connecting_rods',
    order: 4,
    name: 'Connecting Rods',
    shortName: 'Con Rods',
    group: 'Core Engine',
    description:
      'Center-to-center rod length, side clearance, rod bolt torque/stretch, and beam material.',
    subassemblyKeys: ['rotating'],
    bomCategories: ['Connecting Rods'],
    fields: [
      {
        key: 'rodLength',
        label: 'Connecting Rod Length (C-to-C)',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'in',
        min: 4.5,
        max: 7.0,
        step: 0.005,
        precision: 3,
        configKey: 'rodLength',
        description: 'Drives rod/stroke ratio and maximum connecting rod angle.',
        getFactory: ({ catalog }) => ({
          value: catalog ? catalog.rodLength : RAY_BASELINE_CONFIG.rodLength,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'rodSideClearance',
        label: 'Rod Side Clearance',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied side clearance',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('ROD SIDE CLEARANCE');
          return {
            value: spec ? spec.value : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'rodBoltTorque',
        label: 'Connecting Rod Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Connecting Rod Bolts');
          return {
            value: spec ? `${spec.stock} (stock) / ${spec.arp}` : null,
            source: spec ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'rodBoltStretch',
        label: 'Rod Bolt Stretch Spec',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied bolt stretch',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Connecting Rod Bolts');
          return {
            value: spec?.stretch ?? null,
            source: spec?.stretch ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'rodPartNumber',
        label: 'Connecting Rod Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Connecting Rods');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'rodMaterial',
        label: 'Connecting Rod Material & Beam',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Connecting Rods');
          if (bom && bom.part.includes('Forged 4340 H-Beam')) {
            return { value: 'Forged 4340 Steel H-Beam', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'rodBearingClearance',
        label: 'Rod Bearing Oil Clearance',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied oil clearance',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 5. PISTONS
  {
    id: 'pistons',
    order: 5,
    name: 'Pistons',
    shortName: 'Pistons',
    group: 'Core Engine',
    description:
      'Valve relief / dish / dome volume, piston alloy (PTW clearance), and ring gap application.',
    subassemblyKeys: ['rotating'],
    bomCategories: ['Pistons', 'Piston Rings'],
    fields: [
      {
        key: 'pistonReliefCc',
        label: 'Piston Valve Relief / Dish / Dome',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'cc',
        min: -25,
        max: 45,
        step: 0.5,
        precision: 1,
        configKey: 'pistonReliefCc',
        description: 'Positive = valve relief or dish; negative = piston dome.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.pistonReliefCc,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'pistonAlloy',
        label: 'Piston Alloy (Drives PTW Clearance)',
        mode: 'driving',
        category: 'material',
        inputType: 'select',
        configKey: 'pistonAlloy',
        options: [
          { value: '4032', label: '4032 Forged Low-Expansion (0.0028"-0.0035" PTW)' },
          { value: '2618', label: '2618 Forged Race Alloy (0.0045"-0.0055" PTW)' },
          { value: 'hypereutectic', label: 'Hypereutectic Cast (0.0018"-0.0025" PTW)' }
        ],
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.pistonAlloy,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'ringApplication',
        label: 'Ring End-Gap Duty Factor',
        mode: 'driving',
        category: 'clearance',
        inputType: 'select',
        configKey: 'ringApplication',
        options: [
          { value: 'street', label: 'Street (0.0045" × Bore)' },
          { value: 'street_strip', label: 'Street / Strip (0.0050" × Bore)' },
          { value: 'nitrous', label: 'Nitrous / Boosted (0.0065" × Bore)' }
        ],
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.ringApplication,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'pistonPartNumber',
        label: 'Piston Set Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Pistons');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'ringsPartNumber',
        label: 'Piston Rings Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Piston Rings');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'ringMaterial',
        label: 'Piston Ring Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied ring material',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Piston Rings');
          if (bom && bom.part.includes('Ductile Iron Moly')) {
            return { value: 'Ductile Iron Moly', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'compressionHeight',
        label: 'Piston Compression Height',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied compression height',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'pinDiameter',
        label: 'Wrist Pin Diameter',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied pin OD',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 6. CAMSHAFT
  {
    id: 'camshaft',
    order: 6,
    name: 'Camshaft',
    shortName: 'Camshaft',
    group: 'Core Engine',
    description:
      'Camshaft grind selection (duration, lobe lift, IVC/DCR, powerband) and core hardware.',
    subassemblyKeys: ['cam'],
    bomCategories: ['Camshaft & Lifters'],
    fields: [
      {
        key: 'camProfile',
        label: 'Camshaft Grind Profile',
        mode: 'driving',
        category: 'performance',
        inputType: 'select',
        configKey: 'camProfile',
        options: [
          { value: 'rv', label: CAM_PROFILES.rv.name },
          { value: 'street', label: CAM_PROFILES.street.name },
          { value: 'radical', label: CAM_PROFILES.radical.name }
        ],
        description: 'Coordination engine reads rv / street / radical profiles for dyno & DCR.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.camProfile,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'camTimingSummary',
        label: 'Baseline Cam Card Spec',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        getFactory: ({ config }) => {
          const cam = CAM_PROFILES[config.camProfile] || CAM_PROFILES.street;
          return {
            value: `${cam.intakeDur050}°/${cam.exhDur050}° @ .050" · ${cam.lobeLift.toFixed(3)}" lobe · ${cam.lsa}° LSA · ${cam.ivcDeg}° IVC`,
            source: `CAM_PROFILES (${cam.id})`
          };
        }
      },
      {
        key: 'camPartNumber',
        label: 'Camshaft & Lifter Kit Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Camshaft & Lifters');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'camCoreMaterial',
        label: 'Cam Core Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied core alloy (e.g. 8620 billet)',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'camBoltTorque',
        label: 'Cam Gear Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'camEndPlay',
        label: 'Camshaft End Play',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied end play',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 7. VALVETRAIN
  {
    id: 'valvetrain',
    order: 7,
    name: 'Valvetrain',
    shortName: 'Valvetrain',
    group: 'Core Engine',
    description:
      'Rocker arm ratio (drives total valve lift), lash/preload spec, springs, and pushrods.',
    subassemblyKeys: ['heads'],
    bomCategories: ['Rocker Arms'],
    fields: [
      {
        key: 'rockerRatio',
        label: 'Rocker Arm Ratio',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: ':1',
        min: 1.3,
        max: 2.0,
        step: 0.05,
        precision: 2,
        configKey: 'rockerRatio',
        description: 'Multiplies cam lobe lift to determine total valve lift.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.rockerRatio,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'valveLashPreload',
        label: 'Valve Lash / Lifter Preload',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied lash / preload',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('HYDRAULIC VALVE LASH PRELOAD');
          return {
            value: spec ? spec.value : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'rockerPartNumber',
        label: 'Rocker Arms Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Rocker Arms');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'rockerMaterial',
        label: 'Rocker Arm Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Rocker Arms');
          if (bom && bom.part.includes('Billet Aluminum')) {
            return { value: 'Billet Aluminum (7/16" Stud Roller)', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'pushrodLength',
        label: 'Pushrod Length & Diameter',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied pushrod spec',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'springSeatPressure',
        label: 'Valve Spring Seat / Open Pressure',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied spring pressures',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'rockerStudTorque',
        label: 'Rocker Stud Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 8. INTAKE MANIFOLD
  {
    id: 'intake_manifold',
    order: 8,
    name: 'Intake Manifold',
    shortName: 'Intake',
    group: 'Induction & Ignition',
    description:
      'Plenum architecture (dual-plane, single-plane, tunnel ram), runner volume, and bolt torque.',
    subassemblyKeys: ['intake'],
    bomCategories: [],
    fields: [
      {
        key: 'selectedIntake',
        label: 'Intake Manifold Architecture',
        mode: 'driving',
        category: 'performance',
        inputType: 'select',
        configKey: 'selectedIntake',
        options: INTAKE_MANIFOLDS.map((m) => ({
          value: m.id,
          label: `${m.name} (${m.runnerCc}cc / ${m.flowCfm} CFM)`
        })),
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.selectedIntake,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'intakeRunnerSpec',
        label: 'Manifold Runner Volume & Flow',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        getFactory: ({ config }) => {
          const intake =
            INTAKE_MANIFOLDS.find((m) => m.id === config.selectedIntake) ||
            INTAKE_MANIFOLDS[0];
          return {
            value: `${intake.runnerCc} cc runner · ${intake.flowCfm} CFM (${intake.style})`,
            source: `INTAKE_MANIFOLDS (${intake.id})`
          };
        }
      },
      {
        key: 'intakeBoltTorque',
        label: 'Intake Manifold Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque & spiral sequence',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findTorqueSpec('Intake Manifold Bolts');
          return {
            value: spec ? `${spec.stock} (stock) / ${spec.arp}` : null,
            source: spec ? 'ARP_TORQUE_AND_STRETCH_SPECS' : null
          };
        }
      },
      {
        key: 'intakePartNumber',
        label: 'Intake Manifold Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'intakeMaterial',
        label: 'Intake Manifold Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'portGasketMatch',
        label: 'Port-to-Head Gasket Match Notes',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied port alignment / gasket spec',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 9. CARBURETOR / EFI
  {
    id: 'carb_efi',
    order: 9,
    name: 'Carburetor / EFI',
    shortName: 'Carb / EFI',
    group: 'Induction & Ignition',
    description:
      'Carburetor vs MPFI dress mode, airflow CFM rating, target AFR, and jetting/injector specs.',
    subassemblyKeys: ['intake', 'efiRails'],
    bomCategories: [],
    fields: [
      {
        key: 'inductionDress',
        label: 'Fuel Metering Architecture',
        mode: 'driving',
        category: 'performance',
        inputType: 'select',
        configKey: 'inductionDress',
        options: [
          { value: 'carb_hei', label: 'Carburetor + HEI Distributor' },
          { value: 'mpfi_cnp', label: 'MPFI + 90mm Throttle Body + Coil-Near-Plug' }
        ],
        description: 'Switches 3D dress and dyno airflow/BSFC multipliers.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.inductionDress ?? 'carb_hei',
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'carbCfm',
        label: 'Carburetor / Throttle Airflow Rating',
        mode: 'driving',
        category: 'performance',
        inputType: 'number',
        unit: 'CFM',
        min: 350,
        max: 1400,
        step: 25,
        precision: 0,
        configKey: 'carbCfm',
        description: 'Compared against peak CFM demand in dyno calculation.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.carbCfm,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'targetAFR',
        label: 'Target Wide-Open-Throttle AFR',
        mode: 'driving',
        category: 'performance',
        inputType: 'number',
        unit: ':1',
        min: 10.5,
        max: 16.0,
        step: 0.1,
        precision: 1,
        configKey: 'targetAFR',
        description: '12.9:1 is optimal power rich for pump-gas NA builds.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.targetAFR,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'carbEfiPartNumber',
        label: 'Carburetor / EFI Kit Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'jettingInjectorSpec',
        label: 'Main Jets / Injector Flow Spec',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied jetting or lb/hr injector size',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'carbBodyMaterial',
        label: 'Throttle / Carb Body Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'carbMountTorque',
        label: 'Carb Base / Throttle Body Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 10. IGNITION
  {
    id: 'ignition',
    order: 10,
    name: 'Ignition',
    shortName: 'Ignition',
    group: 'Induction & Ignition',
    description:
      'Total advance timing (knock limit > 38°), spark plug gap, firing order, and distributor hardware.',
    subassemblyKeys: ['ignition'],
    bomCategories: ['Ignition Distributor'],
    fields: [
      {
        key: 'ignitionTiming',
        label: 'Total Ignition Advance @ 3,000 RPM',
        mode: 'driving',
        category: 'performance',
        inputType: 'number',
        unit: '° BTDC',
        min: 18,
        max: 46,
        step: 1,
        precision: 0,
        configKey: 'ignitionTiming',
        description: '36° is optimal for wedge SBC 350; >38° triggers knock risk penalty.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.ignitionTiming,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'sparkPlugGap',
        label: 'Spark Plug Electrode Gap',
        mode: 'driving',
        category: 'clearance',
        inputType: 'number',
        unit: 'in',
        min: 0.02,
        max: 0.065,
        step: 0.002,
        precision: 3,
        configKey: 'sparkPlugGap',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.sparkPlugGap,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'firingOrder',
        label: 'Cylinder Firing Order',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        getFactory: ({ catalog }) => ({
          value: catalog?.firingOrder ?? null,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : null
        })
      },
      {
        key: 'initialTimingSpec',
        label: 'Initial Base Timing @ Idle',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied initial idle timing',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('INITIAL IGNITION TIMING');
          return {
            value: spec ? spec.value : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'distributorPartNumber',
        label: 'Distributor / Ignition Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Ignition Distributor');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'sparkPlugReference',
        label: 'Spark Plug Reference Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied spark plug PN',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('SPARK PLUG GAP');
          return {
            value: spec ? 'ACDelco R45TS or NGK BPR6FS' : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'sparkPlugTorque',
        label: 'Spark Plug Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'distributorGearMaterial',
        label: 'Distributor Gear / Wire Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied gear / wire material',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 11. LUBRICATION
  {
    id: 'lubrication',
    order: 11,
    name: 'Lubrication',
    shortName: 'Lubrication',
    group: 'Support Systems',
    description:
      'Oil pump, pickup-to-pan clearance, oil pan capacity, viscosity, and fastener torque (display-only).',
    subassemblyKeys: ['lubrication', 'oilPan'],
    bomCategories: ['Oil Pump & Pickup'],
    fields: [
      {
        key: 'pickupToPanClearance',
        label: 'Oil Pump Pickup to Pan Bottom',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied pickup clearance',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('OIL PUMP PICKUP TO PAN BOTTOM');
          return {
            value: spec ? spec.value : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'oilPumpPartNumber',
        label: 'Oil Pump & Pickup Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Oil Pump & Pickup');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'oilPanCapacity',
        label: 'Oil Pan Capacity & Sump Depth',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied quarts / sump depth',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'oilPumpBoltTorque',
        label: 'Oil Pump & Pan Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque specs',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'oilPanMaterial',
        label: 'Oil Pan & Pump Housing Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'oilViscositySpec',
        label: 'Oil Viscosity & Target Pressure',
        mode: 'display',
        category: 'notes',
        inputType: 'text',
        placeholder: 'Maker-supplied viscosity / PSI spec',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 12. COOLING
  {
    id: 'cooling',
    order: 12,
    name: 'Cooling',
    shortName: 'Cooling',
    group: 'Support Systems',
    description:
      'Water pump flow rate, housing material, thermostat rating, and cooling clearances (display-only).',
    subassemblyKeys: ['cooling'],
    bomCategories: ['Water Pump'],
    fields: [
      {
        key: 'waterPumpPartNumber',
        label: 'Water Pump Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Water Pump');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'waterPumpFlowRate',
        label: 'Water Pump Flow Rating',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied GPM flow rating',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Water Pump');
          if (bom && bom.part.includes('35 GPM')) {
            return { value: '35 GPM', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'waterPumpMaterial',
        label: 'Water Pump Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Water Pump');
          if (bom && bom.part.includes('Aluminum')) {
            return { value: 'Aluminum', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'thermostatTemp',
        label: 'Thermostat Opening Temperature',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied thermostat rating (°F)',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'waterPumpBoltTorque',
        label: 'Water Pump & Thermostat Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'fanShroudClearance',
        label: 'Fan-to-Radiator Clearance',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied clearance',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 13. FUEL SYSTEM
  {
    id: 'fuel_system',
    order: 13,
    name: 'Fuel System',
    shortName: 'Fuel System',
    group: 'Support Systems',
    description:
      'Fuel pump flow rating, regulated line pressure, fuel line sizing, and hardware specs (display-only).',
    subassemblyKeys: ['fuel'],
    bomCategories: ['Fuel Pump'],
    fields: [
      {
        key: 'fuelPressureSpec',
        label: 'Fuel Pressure Specification',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied fuel pressure (PSI)',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('FUEL PRESSURE TO CARB');
          return {
            value: spec ? spec.value : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'fuelPumpPartNumber',
        label: 'Fuel Pump Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Fuel Pump');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'fuelPumpFlowSpec',
        label: 'Fuel Pump Flow Capacity',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied GPH / LPH flow spec',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Fuel Pump');
          if (bom && bom.part.includes('110 GPH')) {
            return { value: '110 GPH Mechanical (6.5 PSI)', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'fuelLineDimension',
        label: 'Fuel Line Size & Fitting Spec',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied AN size / line OD',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'fuelLineMaterial',
        label: 'Fuel Line & Rail Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material (e.g. PTFE / 6061)',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'fuelPumpTorque',
        label: 'Fuel Pump & Fitting Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 14. STARTER
  {
    id: 'starter',
    order: 14,
    name: 'Starter',
    shortName: 'Starter',
    group: 'Support Systems',
    description:
      'Pinion backlash clearance, ring gear tooth count, mini-starter specs, and mounting torque (display-only).',
    subassemblyKeys: ['starter'],
    bomCategories: ['Starter Motor', 'Alternator'],
    fields: [
      {
        key: 'pinionBacklash',
        label: 'Starter Pinion Backlash',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied backlash clearance',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const spec = findMechanicSpec('STARTER PINION BACKLASH');
          return {
            value: spec ? spec.value : null,
            source: spec ? 'MECHANIC_SPECS_LIBRARY' : null
          };
        }
      },
      {
        key: 'ringGearTeeth',
        label: 'Flywheel / Flexplate Ring Gear Teeth',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        getFactory: ({ catalog }) => ({
          value: catalog?.flywheelTeeth ?? null,
          source: catalog ? `ENGINE_CATALOG (${catalog.shortName})` : null
        })
      },
      {
        key: 'starterPartNumber',
        label: 'Starter Motor Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Starter Motor');
          return { value: bom ? bom.num : null, source: bom ? 'BASE_BOM' : null };
        }
      },
      {
        key: 'starterSpecSummary',
        label: 'Starter Output & Gear Reduction',
        mode: 'display',
        category: 'performance',
        inputType: 'text',
        placeholder: 'Maker-supplied kW / reduction ratio',
        getFactory: ({ catalog }) => {
          if (!isSbc350Baseline(catalog)) return { value: null, source: null };
          const bom = findBomItem('Starter Motor');
          if (bom && bom.part.includes('1.4 kW 4:1 Gear')) {
            return { value: '1.4 kW 4:1 Gear Reduction', source: 'BASE_BOM' };
          }
          return { value: null, source: null };
        }
      },
      {
        key: 'starterBoltTorque',
        label: 'Starter Mounting Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'starterHousingMaterial',
        label: 'Starter Nose / Housing Material',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 15. TRANSMISSION
  {
    id: 'transmission',
    order: 15,
    name: 'Transmission',
    shortName: 'Transmission',
    group: 'Powertrain',
    description:
      'Transmission unit, converter stall speed, custom gear ratios (via transOverridesById), and fitment.',
    subassemblyKeys: [
      'bellhousing',
      'converter',
      'frontPump',
      'clutchPack',
      'mainCase',
      'valveBody',
      'pan',
      'tailhousing'
    ],
    bomCategories: [],
    fields: [
      {
        key: 'selectedTrans',
        label: 'Transmission Unit',
        mode: 'driving',
        category: 'performance',
        inputType: 'select',
        configKey: 'selectedTrans',
        options: Object.values(TRANSMISSIONS_DB).map((t) => ({
          value: t.id,
          label: `${t.name} (${t.type})`
        })),
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.selectedTrans,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'stallSpeed',
        label: 'Torque Converter Stall Speed',
        mode: 'driving',
        category: 'performance',
        inputType: 'number',
        unit: 'RPM',
        min: 0,
        max: 6500,
        step: 100,
        precision: 0,
        configKey: 'stallSpeed',
        description: '0 RPM for manual clutch setups.',
        getFactory: ({ trans }) => ({
          value: trans ? trans.defaultStall : RAY_BASELINE_CONFIG.stallSpeed,
          source: trans ? `TRANSMISSIONS_DB (${trans.id})` : 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'transRatios',
        label: 'Forward Gear Ratios (Comma-Separated)',
        mode: 'driving',
        category: 'dimension',
        inputType: 'text',
        transOverrideKey: 'ratios',
        placeholder: 'e.g. 2.52, 1.52, 1.00',
        description: 'Feeds transOverridesById into calculateCoordinatedSpecs speed-in-gear math.',
        getFactory: ({ trans }) => ({
          value: trans ? trans.ratios.join(', ') : null,
          source: trans ? `TRANSMISSIONS_DB (${trans.id})` : null
        })
      },
      {
        key: 'transLengthInches',
        label: 'Transmission Overall Length',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'in',
        min: 15,
        max: 45,
        step: 0.1,
        precision: 1,
        transOverrideKey: 'lengthInches',
        getFactory: ({ trans }) => ({
          value: trans ? trans.lengthInches : null,
          source: trans ? `TRANSMISSIONS_DB (${trans.id})` : null
        })
      },
      {
        key: 'transPattern',
        label: 'Native Bellhousing Pattern',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        getFactory: ({ trans }) => ({
          value: trans ? trans.nativePattern : null,
          source: trans ? `TRANSMISSIONS_DB (${trans.id})` : null
        })
      },
      {
        key: 'transClutchSpec',
        label: 'Clutch / Internal Pack Spec',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        getFactory: ({ trans }) => ({
          value: trans ? trans.clutch : null,
          source: trans ? `TRANSMISSIONS_DB (${trans.id})` : null
        })
      },
      {
        key: 'transTunnelProfile',
        label: 'Floorpan Tunnel Clearance Profile',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        getFactory: ({ trans }) => ({
          value: trans ? trans.tunnelProfile : null,
          source: trans ? `TRANSMISSIONS_DB (${trans.id})` : null
        })
      },
      {
        key: 'transPartNumber',
        label: 'Transmission Assembly / Case Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'bellhousingTorque',
        label: 'Bellhousing & Converter Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  },

  // 16. DRIVELINE
  {
    id: 'driveline',
    order: 16,
    name: 'Driveline',
    shortName: 'Driveline',
    group: 'Powertrain',
    description:
      'Target vehicle chassis, rear axle ratio, rear tire diameter, driveshaft geometry, and U-joints.',
    subassemblyKeys: ['chassis', 'slipYoke'],
    bomCategories: [],
    fields: [
      {
        key: 'selectedVehicle',
        label: 'Target Vehicle / Chassis',
        mode: 'driving',
        category: 'dimension',
        inputType: 'select',
        configKey: 'selectedVehicle',
        options: Object.values(VEHICLES_CATALOG).map((v) => ({
          value: v.id,
          label: `${v.make} ${v.model} (${v.yearRange[0]}–${v.yearRange[1]})`
        })),
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.selectedVehicle,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'rearGear',
        label: 'Rear Axle Final Drive Ratio',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: ':1',
        min: 2.2,
        max: 5.57,
        step: 0.01,
        precision: 2,
        configKey: 'rearGear',
        description: 'Drives total gear reduction, MPH in gear, and 65 MPH cruise RPM.',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.rearGear,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'tireDiameter',
        label: 'Rear Tire Overall Diameter',
        mode: 'driving',
        category: 'dimension',
        inputType: 'number',
        unit: 'in',
        min: 20,
        max: 36,
        step: 0.1,
        precision: 1,
        configKey: 'tireDiameter',
        getFactory: () => ({
          value: RAY_BASELINE_CONFIG.tireDiameter,
          source: 'RAY_BASELINE_CONFIG'
        })
      },
      {
        key: 'chassisTunnelSpec',
        label: 'Chassis Transmission Tunnel Fitment',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        getFactory: ({ vehicle }) => ({
          value: vehicle ? vehicle.tunnelSize : null,
          source: vehicle ? `VEHICLES_CATALOG (${vehicle.id})` : null
        })
      },
      {
        key: 'driveshaftLength',
        label: 'Driveshaft C-to-C Length',
        mode: 'display',
        category: 'dimension',
        inputType: 'text',
        placeholder: 'Maker-supplied driveshaft length',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'pinionAngle',
        label: 'Working Pinion & U-Joint Angle',
        mode: 'display',
        category: 'clearance',
        inputType: 'text',
        placeholder: 'Maker-supplied angle (degrees)',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'uJointPartNumber',
        label: 'U-Joint / Slip Yoke Part Number',
        mode: 'display',
        category: 'part_number',
        inputType: 'text',
        placeholder: 'Maker-supplied part number (e.g. 1350 series)',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'driveshaftMaterial',
        label: 'Driveshaft Tube Material & OD',
        mode: 'display',
        category: 'material',
        inputType: 'text',
        placeholder: 'Maker-supplied material (e.g. 6061-T6 / Chromoly)',
        getFactory: () => ({ value: null, source: null })
      },
      {
        key: 'yokeBoltTorque',
        label: 'U-Joint Strap / Yoke Bolt Torque',
        mode: 'display',
        category: 'torque',
        inputType: 'text',
        placeholder: 'Maker-supplied torque spec',
        getFactory: () => ({ value: null, source: null })
      }
    ]
  }
];

export const PART_SYSTEMS_BY_ID: Record<PartSystemId, PartSystemDefinition> =
  PART_SYSTEMS.reduce(
    (acc, part) => {
      acc[part.id] = part;
      return acc;
    },
    {} as Record<PartSystemId, PartSystemDefinition>
  );

export function parseTransmissionRatios(raw: string): number[] | null {
  const tokens = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (tokens.length < 2 || tokens.length > 10) return null;
  const parsed: number[] = [];
  for (const token of tokens) {
    if (!/^\d+(\.\d+)?$/.test(token)) return null;
    const val = Number(token);
    if (!Number.isFinite(val) || val < 0.4 || val > 6.0) return null;
    parsed.push(+val.toFixed(3));
  }
  return parsed;
}

export function valuesAreEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  inputType: PartInputType
): boolean {
  if (a === null || a === undefined || a === '') {
    return b === null || b === undefined || b === '';
  }
  if (b === null || b === undefined || b === '') {
    return false;
  }
  if (inputType === 'number') {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) {
      return Math.abs(na - nb) < 1e-6;
    }
  }
  return String(a).trim() === String(b).trim();
}

export function validatePartFieldValue(
  field: PartFieldDefinition,
  rawValue: string | number
): string | null {
  if (field.key === 'transRatios') {
    const str = String(rawValue).trim();
    if (!str) return 'Enter 2–10 comma-separated gear ratios (0.40 – 6.00).';
    if (!parseTransmissionRatios(str)) {
      return 'Use 2–10 valid ratios between 0.40 and 6.00 (e.g. 2.52, 1.52, 1.00).';
    }
    return null;
  }

  if (field.inputType === 'number') {
    const str = String(rawValue).trim();
    if (str === '') {
      return field.mode === 'driving' ? `${field.label} is required.` : null;
    }
    const num = Number(str);
    if (!Number.isFinite(num)) {
      return 'Enter a valid number.';
    }
    if (field.min !== undefined && num < field.min) {
      return `Must be at least ${field.min}${field.unit ? ` ${field.unit}` : ''}.`;
    }
    if (field.max !== undefined && num > field.max) {
      return `Must be at most ${field.max}${field.unit ? ` ${field.unit}` : ''}.`;
    }
    return null;
  }

  if (field.inputType === 'select' && field.options) {
    const exists = field.options.some((opt) => String(opt.value) === String(rawValue));
    if (!exists) return 'Select a valid option.';
  }

  return null;
}

export function formatOptionLabel(
  field: PartFieldDefinition,
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.options) {
    const found = field.options.find((o) => String(o.value) === String(value));
    if (found) return found.label;
  }
  if (field.inputType === 'number' && typeof value === 'number') {
    const formatted =
      field.precision !== undefined ? value.toFixed(field.precision) : String(value);
    return field.unit ? `${formatted} ${field.unit}` : formatted;
  }
  return field.unit ? `${value} ${field.unit}` : String(value);
}

export function buildFactoryContext(
  config: EngineConfig,
  catalog?: EngineCatalogItem | null
): PartFactoryContext {
  const activeCatalog = catalog || resolveActiveCatalogEngine(config);
  const trans = TRANSMISSIONS_DB[config.selectedTrans] || TRANSMISSIONS_DB.th350 || null;
  const vehicle = VEHICLES_CATALOG[config.selectedVehicle] || VEHICLES_CATALOG.camaro1969 || null;
  return {
    catalog: activeCatalog,
    trans,
    vehicle,
    config
  };
}

export function getEffectiveFieldState(
  partId: PartSystemId,
  field: PartFieldDefinition,
  config: EngineConfig,
  partOverrides: PartOverridesMap,
  ctx: PartFactoryContext,
  transOverridesById?: Record<string, Partial<TransmissionItem>>
): EffectiveFieldState {
  const factoryRes = field.getFactory(ctx);
  const override = partOverrides[partId]?.fields?.[field.key] ?? null;
  const isMakerSupplied = factoryRes.value === null || factoryRes.value === undefined;

  let effectiveValue: string | number | '' = '';

  if (field.mode === 'driving' && field.configKey) {
    const cfgVal = config[field.configKey];
    if (cfgVal !== undefined) {
      effectiveValue = cfgVal;
    } else if (field.key === 'cylinders') {
      effectiveValue = ctx.catalog?.cylinders ?? 8;
    } else if (field.key === 'inductionDress') {
      effectiveValue = 'carb_hei';
    }
  } else if (field.transOverrideKey && ctx.trans) {
    const tOverride = transOverridesById?.[ctx.trans.id];
    if (field.transOverrideKey === 'ratios') {
      const ratios = tOverride?.ratios ?? ctx.trans.ratios;
      effectiveValue = ratios.join(', ');
    } else if (field.transOverrideKey === 'lengthInches') {
      effectiveValue = tOverride?.lengthInches ?? ctx.trans.lengthInches;
    } else if (field.transOverrideKey === 'reverse') {
      effectiveValue = tOverride?.reverse ?? ctx.trans.reverse;
    }
  } else if (override) {
    effectiveValue = override.value;
  } else if (factoryRes.value !== null && factoryRes.value !== undefined) {
    effectiveValue = factoryRes.value;
  }

  const isCustom =
    override !== null ||
    (!isMakerSupplied &&
      effectiveValue !== '' &&
      !valuesAreEqual(effectiveValue, factoryRes.value, field.inputType));

  return {
    field,
    factoryValue: factoryRes.value,
    factorySource: factoryRes.source,
    effectiveValue,
    isCustom,
    isMakerSupplied,
    override
  };
}

export function updatePartFieldOverride(
  prevMap: PartOverridesMap,
  partId: PartSystemId,
  field: PartFieldDefinition,
  nextValue: string | number | null,
  factoryValue: string | number | null
): PartOverridesMap {
  const now = new Date().toISOString();
  const nextMap: PartOverridesMap = { ...prevMap };
  const existingPart = nextMap[partId];
  const nextFields: Record<string, PartFieldOverride> = {
    ...(existingPart?.fields ?? {})
  };

  const isBlank =
    nextValue === null ||
    nextValue === undefined ||
    (typeof nextValue === 'string' && nextValue.trim() === '');

  const matchesFactory =
    factoryValue !== null &&
    factoryValue !== undefined &&
    !isBlank &&
    valuesAreEqual(nextValue, factoryValue, field.inputType);

  if (isBlank || matchesFactory) {
    delete nextFields[field.key];
  } else {
    nextFields[field.key] = {
      fieldKey: field.key,
      label: field.label,
      value:
        field.inputType === 'number' && typeof nextValue !== 'number'
          ? Number(nextValue)
          : nextValue,
      unit: field.unit,
      factoryValue,
      mode: field.mode,
      category: field.category,
      configKey: field.configKey,
      makerSupplied: factoryValue === null || factoryValue === undefined,
      updatedAt: now
    };
  }

  if (Object.keys(nextFields).length === 0) {
    delete nextMap[partId];
  } else {
    const updatedPart: PartCustomOverride = {
      partId,
      fields: nextFields,
      updatedAt: now
    };
    nextMap[partId] = updatedPart;
  }

  return nextMap;
}

export function resetSinglePartOverrides(
  prevMap: PartOverridesMap,
  partId: PartSystemId
): PartOverridesMap {
  if (!prevMap[partId]) return prevMap;
  const next = { ...prevMap };
  delete next[partId];
  return next;
}

export function buildTransOverridesFromPartMap(
  partOverrides: PartOverridesMap,
  selectedTransId: string,
  baseTransOverrides?: Record<string, Partial<TransmissionItem>>
): Record<string, Partial<TransmissionItem>> {
  const result: Record<string, Partial<TransmissionItem>> = {
    ...(baseTransOverrides ?? {})
  };
  const transFields = partOverrides.transmission?.fields;
  if (!transFields) return result;

  const baseTrans = TRANSMISSIONS_DB[selectedTransId];
  if (!baseTrans) return result;

  const nextEntry: Partial<TransmissionItem> = {
    ...(result[selectedTransId] ?? {})
  };

  let changed = false;
  if (transFields.transRatios) {
    const parsed = parseTransmissionRatios(String(transFields.transRatios.value));
    if (parsed) {
      nextEntry.ratios = parsed;
      changed = true;
    }
  } else if (nextEntry.ratios) {
    delete nextEntry.ratios;
  }

  if (transFields.transLengthInches) {
    const len = Number(transFields.transLengthInches.value);
    if (Number.isFinite(len) && len >= 15 && len <= 45) {
      nextEntry.lengthInches = len;
      changed = true;
    }
  } else if (nextEntry.lengthInches !== undefined) {
    delete nextEntry.lengthInches;
  }

  if (changed || Object.keys(nextEntry).length > 0) {
    result[selectedTransId] = nextEntry;
  } else {
    delete result[selectedTransId];
  }

  return result;
}

export function loadStoredPartOverrides(): PartOverridesMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PART_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PartOverridesMap) : {};
  } catch {
    return {};
  }
}

export function saveStoredPartOverrides(map: PartOverridesMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PART_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function loadStoredTransOverrides(): Record<string, Partial<TransmissionItem>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TRANS_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, Partial<TransmissionItem>>)
      : {};
  } catch {
    return {};
  }
}

export function saveStoredTransOverrides(
  map: Record<string, Partial<TransmissionItem>>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TRANS_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getOverridesForBomAndInspector(
  partOverrides: PartOverridesMap
): InspectorOverrideEntry[] {
  const entries: InspectorOverrideEntry[] = [];
  for (const part of PART_SYSTEMS) {
    const partOverride = partOverrides[part.id];
    if (!partOverride) continue;
    for (const fieldDef of part.fields) {
      const ov = partOverride.fields[fieldDef.key];
      if (!ov) continue;
      entries.push({
        partId: part.id,
        partName: part.name,
        fieldKey: ov.fieldKey,
        label: ov.label,
        value: ov.value,
        unit: ov.unit,
        factoryValue: ov.factoryValue,
        mode: ov.mode,
        category: ov.category,
        makerSupplied: ov.makerSupplied,
        updatedAt: ov.updatedAt
      });
    }
  }
  return entries;
}

export function getMergedBomItems(
  baseBom: BOMItem[],
  partOverrides: PartOverridesMap
): MergedBOMItem[] {
  const partNumberFieldByBomCat: Record<
    string,
    { partId: PartSystemId; partNumberKey: string; materialKey?: string }
  > = {
    'Engine Block': {
      partId: 'engine_block',
      partNumberKey: 'blockPartNumber',
      materialKey: 'blockMaterial'
    },
    'Head Gaskets': {
      partId: 'engine_block',
      partNumberKey: 'headGasketPartNumber'
    },
    'Cylinder Heads': {
      partId: 'cylinder_heads',
      partNumberKey: 'headPartNumber',
      materialKey: 'headMaterial'
    },
    Crankshaft: {
      partId: 'crankshaft',
      partNumberKey: 'crankPartNumber',
      materialKey: 'crankMaterial'
    },
    'Connecting Rods': {
      partId: 'connecting_rods',
      partNumberKey: 'rodPartNumber',
      materialKey: 'rodMaterial'
    },
    Pistons: {
      partId: 'pistons',
      partNumberKey: 'pistonPartNumber'
    },
    'Piston Rings': {
      partId: 'pistons',
      partNumberKey: 'ringsPartNumber',
      materialKey: 'ringMaterial'
    },
    'Camshaft & Lifters': {
      partId: 'camshaft',
      partNumberKey: 'camPartNumber',
      materialKey: 'camCoreMaterial'
    },
    'Rocker Arms': {
      partId: 'valvetrain',
      partNumberKey: 'rockerPartNumber',
      materialKey: 'rockerMaterial'
    },
    'Oil Pump & Pickup': {
      partId: 'lubrication',
      partNumberKey: 'oilPumpPartNumber',
      materialKey: 'oilPanMaterial'
    },
    'Ignition Distributor': {
      partId: 'ignition',
      partNumberKey: 'distributorPartNumber',
      materialKey: 'distributorGearMaterial'
    },
    'Water Pump': {
      partId: 'cooling',
      partNumberKey: 'waterPumpPartNumber',
      materialKey: 'waterPumpMaterial'
    },
    'Fuel Pump': {
      partId: 'fuel_system',
      partNumberKey: 'fuelPumpPartNumber',
      materialKey: 'fuelLineMaterial'
    },
    'Starter Motor': {
      partId: 'starter',
      partNumberKey: 'starterPartNumber',
      materialKey: 'starterHousingMaterial'
    }
  };

  return baseBom.map((item) => {
    const mapping = partNumberFieldByBomCat[item.cat];
    if (!mapping) return { ...item };

    const partOv = partOverrides[mapping.partId];
    const pnOv = partOv?.fields?.[mapping.partNumberKey];
    const matOv = mapping.materialKey ? partOv?.fields?.[mapping.materialKey] : undefined;

    if (!pnOv && !matOv) return { ...item };

    return {
      ...item,
      num: pnOv ? String(pnOv.value) : item.num,
      factoryPartNum: item.num,
      isCustom: true,
      isMakerSupplied: Boolean(pnOv?.makerSupplied || matOv?.makerSupplied),
      customMaterial: matOv ? String(matOv.value) : undefined,
      partId: mapping.partId
    };
  });
}