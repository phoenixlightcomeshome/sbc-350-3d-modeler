/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EngineBrand, ENGINE_BRANDS, ENGINE_FAMILIES } from './engineFamilies';
import { VEHICLE_CATALOG_GLOBAL } from './vehicleCatalogGlobal';

export interface VehicleCatalogYearOption {
  yearStart: number;
  yearEnd: number;
  engineFamilyIds: string[]; // Strictly references keys in ENGINE_FAMILIES
  trimNote?: string;
}

export interface VehicleCatalogEntry {
  id: string;
  brand: EngineBrand;
  make: string;
  model: string;
  chassisCode: string;
  yearStart: number;
  yearEnd: number;
  category: 'Muscle Car' | 'Pickup / Work Truck' | 'SUV / 4x4' | 'Sports Car' | 'Sedan / Fleet';
  tunnelSize: string;
  yearEngineOptions: VehicleCatalogYearOption[];
  notes?: string;
}

/**
 * Extensible US shop vehicle catalog (~1965–2026).
 * Every engine option strictly points by ID to ENGINE_FAMILIES (zero duplicated specs).
 * Add new makes/models by appending entries following this exact schema.
 */
export const VEHICLE_CATALOG: Record<string, VehicleCatalogEntry> = {
  // =========================================================================
  // GM / CHEVROLET
  // =========================================================================
  chevy_c10_silverado: {
    id: 'chevy_c10_silverado',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'C10 / K10 / C1500 / Silverado 1500',
    chassisCode: 'C/K Series & GMT400 / GMT800 / K2XX / T1XX',
    yearStart: 1965,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Full-Size Truck Transmission Tunnel (Fits TH350, TH400, 700R4, 4L60E, 4L80E, 6L80E, 10L90)',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1968, engineFamilyIds: ['gm_sbc_283', 'gm_sbc_327', 'gm_bbc_396'], trimNote: 'Early C10/K10 Small-Block & 396' },
      { yearStart: 1969, yearEnd: 1972, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350', 'gm_bbc_396', 'gm_bbc_454'], trimNote: 'Action-Line C10 (1970+ 402/454)' },
      { yearStart: 1973, yearEnd: 1980, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350', 'gm_sbc_400', 'gm_bbc_454'], trimNote: 'Squarebody C10/K10 Carbureted' },
      { yearStart: 1981, yearEnd: 1987, engineFamilyIds: ['gm_43_v6', 'gm_sbc_305', 'gm_sbc_350', 'gm_bbc_454'], trimNote: 'Squarebody Late (4.3L V6 intro 1985)' },
      { yearStart: 1988, yearEnd: 1998, engineFamilyIds: ['gm_43_v6', 'gm_sbc_305', 'gm_sbc_350', 'gm_bbc_454'], trimNote: 'GMT400 C/K1500 (TBI & Vortec)' },
      { yearStart: 1999, yearEnd: 2006, engineFamilyIds: ['gm_43_v6', 'gm_ls_53_truck', 'gm_ls_60_truck'], trimNote: 'GMT800 Silverado (LQ9 in SS/VHO)' },
      { yearStart: 2007, yearEnd: 2013, engineFamilyIds: ['gm_43_v6', 'gm_ls_53_truck', 'gm_ls_60_truck', 'gm_lt_62_truck'], trimNote: 'GMT900 Silverado 1500' },
      { yearStart: 2014, yearEnd: 2026, engineFamilyIds: ['gm_ls_53_truck', 'gm_lt_62_truck'], trimNote: 'EcoTec3 / T1XX Direct Injection' }
    ],
    notes: 'Most serviced pickup family in US independent shops.'
  },

  chevy_c20_silverado_hd: {
    id: 'chevy_c20_silverado_hd',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'C20 / C30 / C2500 / Silverado 2500HD–3500HD',
    chassisCode: 'C/K Heavy Duty & GMT800–T1XX HD',
    yearStart: 1968,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Heavy-Duty High-Hump Tunnel (Fits TH400, 4L80E, 6L90E)',
    yearEngineOptions: [
      { yearStart: 1968, yearEnd: 1972, engineFamilyIds: ['gm_sbc_350', 'gm_bbc_396', 'gm_bbc_454'], trimNote: 'Heavy Half / C20 / C30' },
      { yearStart: 1973, yearEnd: 1987, engineFamilyIds: ['gm_sbc_350', 'gm_sbc_400', 'gm_bbc_454'], trimNote: 'Squarebody C20 / K20 / C30' },
      { yearStart: 1988, yearEnd: 2000, engineFamilyIds: ['gm_sbc_350', 'gm_bbc_454'], trimNote: 'GMT400 C/K2500–3500 (5.7L & 7.4L)' },
      { yearStart: 2001, yearEnd: 2020, engineFamilyIds: ['gm_ls_60_truck'], trimNote: '6.0L LQ4 / LY6 / L96 Workhorse' },
      { yearStart: 2020, yearEnd: 2026, engineFamilyIds: ['gm_lt_62_truck'], trimNote: 'Modern HD Gas Architecture (6.6L L8T closely related to 6.2L LT)' }
    ]
  },

  chevy_camaro: {
    id: 'chevy_camaro',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'Camaro (Gen 1–6 Z/28, SS, IROC-Z, ZL1)',
    chassisCode: 'F-Body / Zeta / Alpha',
    yearStart: 1967,
    yearEnd: 2024,
    category: 'Muscle Car',
    tunnelSize: 'Gen 1 Tight (TKX/Muncie/TH350); Gen 2–6 Fits T56/6L80E/10L90',
    yearEngineOptions: [
      { yearStart: 1967, yearEnd: 1969, engineFamilyIds: ['gm_sbc_327', 'gm_sbc_350', 'gm_bbc_396', 'gm_bbc_427'], trimNote: '1st Gen F-Body (COPO 427)' },
      { yearStart: 1970, yearEnd: 1981, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350', 'gm_bbc_396', 'gm_bbc_454'], trimNote: '2nd Gen F-Body (SS 396/402)' },
      { yearStart: 1982, yearEnd: 1992, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350'], trimNote: '3rd Gen Z28 / IROC-Z (TPI 305/350)' },
      { yearStart: 1993, yearEnd: 1997, engineFamilyIds: ['gm_sbc_350'], trimNote: '4th Gen LT1 (SBC-architecture 350)' },
      { yearStart: 1998, yearEnd: 2002, engineFamilyIds: ['gm_ls_ls1'], trimNote: '4th Gen Z28 / SS LS1' },
      { yearStart: 2010, yearEnd: 2015, engineFamilyIds: ['gm_ls_ls3', 'gm_ls_ls7'], trimNote: '5th Gen SS (LS3) & Z/28 (LS7)' },
      { yearStart: 2016, yearEnd: 2024, engineFamilyIds: ['gm_lt_lt1', 'gm_lt_lt4'], trimNote: '6th Gen SS (LT1) & ZL1 (LT4)' }
    ]
  },

  chevy_corvette: {
    id: 'chevy_corvette',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'Corvette (C2 / C3 / C4 / C5 / C6 / C7)',
    chassisCode: 'Sting Ray / C3–C7 Y-Body',
    yearStart: 1965,
    yearEnd: 2019,
    category: 'Sports Car',
    tunnelSize: 'Narrow Center Backbone (C2-C3); Transaxle Torque-Tube (C5-C7)',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1967, engineFamilyIds: ['gm_sbc_327', 'gm_bbc_396', 'gm_bbc_427'], trimNote: 'C2 Sting Ray' },
      { yearStart: 1968, yearEnd: 1969, engineFamilyIds: ['gm_sbc_327', 'gm_sbc_350', 'gm_bbc_427'], trimNote: 'Early C3 (L71/L88 427)' },
      { yearStart: 1970, yearEnd: 1982, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350', 'gm_bbc_454'], trimNote: 'C3 Stingray / Collector Edition' },
      { yearStart: 1984, yearEnd: 1996, engineFamilyIds: ['gm_sbc_350'], trimNote: 'C4 L83 / L98 / Gen II LT1 350' },
      { yearStart: 1997, yearEnd: 2000, engineFamilyIds: ['gm_ls_ls1'], trimNote: 'C5 Base / FRC LS1' },
      { yearStart: 2001, yearEnd: 2004, engineFamilyIds: ['gm_ls_ls1', 'gm_ls_ls6'], trimNote: 'C5 LS1 & Z06 LS6' },
      { yearStart: 2005, yearEnd: 2007, engineFamilyIds: ['gm_ls_ls7'], trimNote: 'C6 Z06 LS7 (base LS2 shares LS1/LS3 architecture)' },
      { yearStart: 2008, yearEnd: 2013, engineFamilyIds: ['gm_ls_ls3', 'gm_ls_ls7'], trimNote: 'C6 LS3 & Z06 LS7' },
      { yearStart: 2014, yearEnd: 2019, engineFamilyIds: ['gm_lt_lt1', 'gm_lt_lt4'], trimNote: 'C7 Stingray (LT1) & Z06 (LT4)' }
    ]
  },

  chevy_chevelle_malibu: {
    id: 'chevy_chevelle_malibu',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'Chevelle / Malibu / El Camino',
    chassisCode: 'GM A-Body / G-Body',
    yearStart: 1965,
    yearEnd: 1987,
    category: 'Muscle Car',
    tunnelSize: 'Generous A-Body Tunnel (Fits Muncie, TH350, TH400, 4L80E, TKX)',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1967, engineFamilyIds: ['gm_sbc_283', 'gm_sbc_327', 'gm_bbc_396'], trimNote: '1st Gen A-Body' },
      { yearStart: 1968, yearEnd: 1972, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350', 'gm_bbc_396', 'gm_bbc_454'], trimNote: '2nd Gen SS 396 / SS 454' },
      { yearStart: 1973, yearEnd: 1977, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350', 'gm_sbc_400', 'gm_bbc_454'], trimNote: 'Colonnade A-Body' },
      { yearStart: 1978, yearEnd: 1987, engineFamilyIds: ['gm_sbc_262', 'gm_sbc_305', 'gm_sbc_350', 'gm_43_v6'], trimNote: 'G-Body Malibu / El Camino SS' }
    ]
  },

  chevy_nova_ii: {
    id: 'chevy_nova_ii',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'Chevy II / Nova',
    chassisCode: 'GM X-Body',
    yearStart: 1965,
    yearEnd: 1979,
    category: 'Muscle Car',
    tunnelSize: 'Compact X-Body Tunnel (TH350, Muncie, T5, TKX direct fit)',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1967, engineFamilyIds: ['gm_sbc_283', 'gm_sbc_327'], trimNote: '2nd Gen Chevy II' },
      { yearStart: 1968, yearEnd: 1974, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_327', 'gm_sbc_350', 'gm_bbc_396'], trimNote: '3rd Gen Nova SS 350 / 396' },
      { yearStart: 1975, yearEnd: 1979, engineFamilyIds: ['gm_sbc_262', 'gm_sbc_305', 'gm_sbc_350'], trimNote: '4th Gen Nova (incl. 262 Monza/Nova)' }
    ]
  },

  chevy_tahoe_suburban: {
    id: 'chevy_tahoe_suburban',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'K5 Blazer / Tahoe / Suburban',
    chassisCode: 'K5 / GMT400–T1XX SUV',
    yearStart: 1969,
    yearEnd: 2026,
    category: 'SUV / 4x4',
    tunnelSize: 'Large Truck/SUV Tunnel (Fits TH350, TH400, 700R4, 4L60E, 4L80E, 6L80E, 10L90)',
    yearEngineOptions: [
      { yearStart: 1969, yearEnd: 1972, engineFamilyIds: ['gm_sbc_350'], trimNote: '1st Gen K5 Blazer / Suburban' },
      { yearStart: 1973, yearEnd: 1991, engineFamilyIds: ['gm_sbc_305', 'gm_sbc_350', 'gm_sbc_400', 'gm_bbc_454'], trimNote: 'Squarebody K5 & 2500 Suburban' },
      { yearStart: 1992, yearEnd: 1999, engineFamilyIds: ['gm_sbc_350', 'gm_bbc_454'], trimNote: 'GMT400 TBI / L31 Vortec' },
      { yearStart: 2000, yearEnd: 2014, engineFamilyIds: ['gm_ls_53_truck', 'gm_ls_60_truck', 'gm_lt_62_truck'], trimNote: 'GMT800 / GMT900' },
      { yearStart: 2015, yearEnd: 2026, engineFamilyIds: ['gm_ls_53_truck', 'gm_lt_62_truck'], trimNote: 'EcoTec3 DI SUV' }
    ]
  },

  chevy_s10_blazer_astro: {
    id: 'chevy_s10_blazer_astro',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet',
    model: 'S-10 / S-10 Blazer / Astro Van',
    chassisCode: 'GMT325 / GMT330 / M-Van',
    yearStart: 1985,
    yearEnd: 2014,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Compact Truck Tunnel (4L60E, 700R4, T5 fit natively; SBC V8 swap popular)',
    yearEngineOptions: [
      { yearStart: 1985, yearEnd: 2005, engineFamilyIds: ['gm_43_v6'], trimNote: 'Factory 4.3L LB4 / L35 / LU3 Workhorse' },
      { yearStart: 2006, yearEnd: 2014, engineFamilyIds: ['gm_43_v6'], trimNote: 'Express/Savana 1500 Work Van 4.3L' }
    ]
  },

  gmc_sierra_c1500: {
    id: 'gmc_sierra_c1500',
    brand: 'GM / Chevrolet',
    make: 'GMC',
    model: 'C1500 / Sierra 1500 / Yukon',
    chassisCode: 'GMC C/K & GMT400–T1XX',
    yearStart: 1967,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Full-Size Truck Tunnel (Fits all GM RWD automatics & manuals)',
    yearEngineOptions: [
      { yearStart: 1967, yearEnd: 1972, engineFamilyIds: ['gm_sbc_283', 'gm_sbc_327', 'gm_sbc_350', 'gm_bbc_396'], trimNote: 'GMC C15 / K15' },
      { yearStart: 1973, yearEnd: 1987, engineFamilyIds: ['gm_43_v6', 'gm_sbc_305', 'gm_sbc_350', 'gm_sbc_400', 'gm_bbc_454'], trimNote: 'GMC Squarebody' },
      { yearStart: 1988, yearEnd: 1998, engineFamilyIds: ['gm_43_v6', 'gm_sbc_305', 'gm_sbc_350', 'gm_bbc_454'], trimNote: 'GMT400 Sierra' },
      { yearStart: 1999, yearEnd: 2013, engineFamilyIds: ['gm_43_v6', 'gm_ls_53_truck', 'gm_ls_60_truck', 'gm_lt_62_truck'], trimNote: 'Sierra 1500 / Denali' },
      { yearStart: 2014, yearEnd: 2026, engineFamilyIds: ['gm_ls_53_truck', 'gm_lt_62_truck'], trimNote: 'Sierra 1500 / Denali Ultimate' }
    ]
  },

  pontiac_cadillac_swap: {
    id: 'pontiac_cadillac_swap',
    brand: 'GM / Chevrolet',
    make: 'Cadillac / Pontiac',
    model: 'CTS-V / GTO / Firebird Trans Am (LS-Powered)',
    chassisCode: 'Sigma / Monaro / 4th Gen F-Body',
    yearStart: 1998,
    yearEnd: 2024,
    category: 'Muscle Car',
    tunnelSize: 'Modern GM Performance Tunnel (T56 / 6L80E / 10L90 native)',
    yearEngineOptions: [
      { yearStart: 1998, yearEnd: 2002, engineFamilyIds: ['gm_ls_ls1'], trimNote: 'Firebird Formula / Trans Am WS6' },
      { yearStart: 2004, yearEnd: 2007, engineFamilyIds: ['gm_ls_ls1', 'gm_ls_ls6'], trimNote: 'Pontiac GTO (LS1) & CTS-V (LS6)' },
      { yearStart: 2016, yearEnd: 2024, engineFamilyIds: ['gm_lt_lt4'], trimNote: 'CTS-V & CT5-V Blackwing (LT4)' }
    ]
  },

  // =========================================================================
  // FORD
  // =========================================================================
  ford_f150: {
    id: 'ford_f150',
    brand: 'Ford',
    make: 'Ford',
    model: 'F-100 / F-150 Pickup',
    chassisCode: 'Bump/Dentside / Bullnose / OBS / P415–P702',
    yearStart: 1965,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Full-Size Ford Truck Tunnel (Fits C4, C6, AOD, E4OD, 10R80)',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1968, engineFamilyIds: ['ford_300_i6', 'ford_sbf_289'], trimNote: 'Twin-I-Beam Era (300 I6)' },
      { yearStart: 1969, yearEnd: 1979, engineFamilyIds: ['ford_300_i6', 'ford_sbf_302', 'ford_sbf_351w', 'ford_bbf_460'], trimNote: 'Dentside Era' },
      { yearStart: 1980, yearEnd: 1996, engineFamilyIds: ['ford_300_i6', 'ford_sbf_302', 'ford_sbf_351w', 'ford_bbf_460'], trimNote: 'Bullnose / Bricknose / OBS (incl. SVT Lightning 351W)' },
      { yearStart: 1997, yearEnd: 2010, engineFamilyIds: ['ford_mod_46', 'ford_mod_54'], trimNote: 'Modular Triton Era' },
      { yearStart: 2011, yearEnd: 2014, engineFamilyIds: ['ford_mod_50_coyote'], trimNote: 'Gen 1 Coyote 5.0L' },
      { yearStart: 2015, yearEnd: 2026, engineFamilyIds: ['ford_mod_50_coyote'], trimNote: 'Aluminum Body Coyote 5.0L' }
    ]
  },

  ford_f250_f350: {
    id: 'ford_f250_f350',
    brand: 'Ford',
    make: 'Ford',
    model: 'F-250 / F-350 Super Duty (Gas V8 / I6)',
    chassisCode: 'OBS HD & Super Duty',
    yearStart: 1965,
    yearEnd: 2022,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Heavy-Duty Truck Tunnel (Fits C6, E4OD, ZF5, 10R80)',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1979, engineFamilyIds: ['ford_300_i6', 'ford_bbf_460'], trimNote: 'Camper Special / Highboy' },
      { yearStart: 1980, yearEnd: 1997, engineFamilyIds: ['ford_300_i6', 'ford_sbf_351w', 'ford_bbf_460'], trimNote: 'OBS HD 5.8L & 7.5L 460' },
      { yearStart: 1999, yearEnd: 2010, engineFamilyIds: ['ford_mod_54'], trimNote: 'Super Duty 5.4L 2V / 3V Triton' },
      { yearStart: 2011, yearEnd: 2022, engineFamilyIds: ['ford_mod_50_coyote'], trimNote: 'Modern Fleet Comparison (6.2L Boss SOHC shares Modular bolt architecture)' }
    ]
  },

  ford_mustang: {
    id: 'ford_mustang',
    brand: 'Ford',
    make: 'Ford',
    model: 'Mustang (Classic / Fox-Body / SN95 / S197 / S550 / S650)',
    chassisCode: '1st Gen–S650',
    yearStart: 1965,
    yearEnd: 2026,
    category: 'Muscle Car',
    tunnelSize: '1965–70 Tight (C4/Toploader/T5); Fox–S650 Fits AOD, T5, T56, 10R80',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1968, engineFamilyIds: ['ford_sbf_289', 'ford_sbf_302'], trimNote: '1st Gen Early (A/K-Code 289, 302)' },
      { yearStart: 1969, yearEnd: 1973, engineFamilyIds: ['ford_sbf_302', 'ford_sbf_351w', 'ford_bbf_429'], trimNote: 'Boss 302, 351W, Boss/CJ 429' },
      { yearStart: 1979, yearEnd: 1995, engineFamilyIds: ['ford_sbf_302', 'ford_sbf_351w'], trimNote: 'Fox-Body 5.0L H.O. & 1995 Cobra R 351W' },
      { yearStart: 1996, yearEnd: 2010, engineFamilyIds: ['ford_mod_46'], trimNote: 'SN95 / S197 4.6L 2V, 3V, 4V Cobra' },
      { yearStart: 2011, yearEnd: 2026, engineFamilyIds: ['ford_mod_50_coyote'], trimNote: 'S197 / S550 / S650 5.0L Coyote GT / Dark Horse' }
    ]
  },

  ford_bronco_classic: {
    id: 'ford_bronco_classic',
    brand: 'Ford',
    make: 'Ford',
    model: 'Bronco (Early U100 & Full-Size)',
    chassisCode: 'U15 / Full-Size Bronco',
    yearStart: 1966,
    yearEnd: 1996,
    category: 'SUV / 4x4',
    tunnelSize: 'Truck/4x4 Tunnel (Fits C4, C6, AOD, ZF5)',
    yearEngineOptions: [
      { yearStart: 1966, yearEnd: 1968, engineFamilyIds: ['ford_sbf_289'], trimNote: 'Early Bronco 289' },
      { yearStart: 1969, yearEnd: 1977, engineFamilyIds: ['ford_sbf_302'], trimNote: 'Early Bronco 302' },
      { yearStart: 1978, yearEnd: 1996, engineFamilyIds: ['ford_300_i6', 'ford_sbf_302', 'ford_sbf_351w'], trimNote: 'Full-Size Bronco' }
    ]
  },

  ford_torino_galaxie: {
    id: 'ford_torino_galaxie',
    brand: 'Ford',
    make: 'Ford',
    model: 'Torino / Fairlane / Galaxie / Ranchero',
    chassisCode: 'Intermediate & Full-Size Ford',
    yearStart: 1965,
    yearEnd: 1976,
    category: 'Muscle Car',
    tunnelSize: 'Mid/Full-Size Tunnel (Fits C4, C6, Toploader, TKX)',
    yearEngineOptions: [
      { yearStart: 1965, yearEnd: 1967, engineFamilyIds: ['ford_sbf_289'], trimNote: 'Fairlane / Galaxie 289' },
      { yearStart: 1968, yearEnd: 1971, engineFamilyIds: ['ford_sbf_302', 'ford_sbf_351w', 'ford_bbf_429'], trimNote: 'Torino Cobra 429 CJ / SCJ' },
      { yearStart: 1972, yearEnd: 1976, engineFamilyIds: ['ford_sbf_302', 'ford_sbf_351w', 'ford_bbf_429', 'ford_bbf_460'], trimNote: 'Gran Torino' }
    ]
  },

  ford_crown_vic_econoline: {
    id: 'ford_crown_vic_econoline',
    brand: 'Ford',
    make: 'Ford',
    model: 'Crown Victoria / E-Series Econoline Van',
    chassisCode: 'Panther Platform & E-150/E-350',
    yearStart: 1979,
    yearEnd: 2016,
    category: 'Sedan / Fleet',
    tunnelSize: 'Body-on-Frame Fleet Tunnel (Fits AOD, 4R70W, C6, 4R100)',
    yearEngineOptions: [
      { yearStart: 1979, yearEnd: 1991, engineFamilyIds: ['ford_300_i6', 'ford_sbf_302', 'ford_sbf_351w', 'ford_bbf_460'], trimNote: 'LTD Crown Vic / E-Series' },
      { yearStart: 1992, yearEnd: 2011, engineFamilyIds: ['ford_mod_46'], trimNote: 'Crown Victoria P71 Police Interceptor 4.6L' },
      { yearStart: 1997, yearEnd: 2016, engineFamilyIds: ['ford_mod_46', 'ford_mod_54'], trimNote: 'E-150 / E-250 / E-350 Work Vans' }
    ]
  },

  // =========================================================================
  // CHRYSLER / MOPAR (DODGE & PLYMOUTH)
  // =========================================================================
  dodge_ram_truck: {
    id: 'dodge_ram_truck',
    brand: 'Chrysler / Mopar',
    make: 'Dodge / Ram',
    model: 'D100 / D150 / Ram 1500–2500 Pickup',
    chassisCode: 'D/W Series, BR/BE, DR/DH, DS/DT',
    yearStart: 1967,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Full-Size Truck Tunnel (Fits A727, A500/42RE/46RE, 8HP70)',
    yearEngineOptions: [
      { yearStart: 1967, yearEnd: 1971, engineFamilyIds: ['mopar_la_318', 'mopar_b_383'], trimNote: 'Sweptline D100/D200' },
      { yearStart: 1972, yearEnd: 1993, engineFamilyIds: ['mopar_la_318', 'mopar_la_360', 'mopar_rb_440'], trimNote: '1st Gen D150/W150 (incl. Li\'l Red Express 360)' },
      { yearStart: 1994, yearEnd: 2002, engineFamilyIds: ['mopar_la_318', 'mopar_la_360'], trimNote: '2nd Gen Ram Magnum 5.2L / 5.9L' },
      { yearStart: 2003, yearEnd: 2013, engineFamilyIds: ['mopar_hemi_57'], trimNote: '3rd/4th Gen Ram 5.7L HEMI' },
      { yearStart: 2014, yearEnd: 2026, engineFamilyIds: ['mopar_hemi_57', 'mopar_hemi_64'], trimNote: 'Ram 1500 (5.7L) & Ram 2500/3500 HD (6.4L HEMI)' }
    ]
  },

  dodge_charger: {
    id: 'dodge_charger',
    brand: 'Chrysler / Mopar',
    make: 'Dodge',
    model: 'Charger (B-Body Classic & LX/LD Modern)',
    chassisCode: 'B-Body & LX/LD',
    yearStart: 1966,
    yearEnd: 2023,
    category: 'Muscle Car',
    tunnelSize: 'B-Body & LX Wide Tunnel (Fits A727, A833, 8HP70)',
    yearEngineOptions: [
      { yearStart: 1966, yearEnd: 1971, engineFamilyIds: ['mopar_la_318', 'mopar_b_383', 'mopar_rb_440'], trimNote: '2nd Gen Charger R/T 440' },
      { yearStart: 1972, yearEnd: 1978, engineFamilyIds: ['mopar_la_318', 'mopar_la_340', 'mopar_la_360', 'mopar_rb_440'], trimNote: '3rd/4th Gen Charger' },
      { yearStart: 2006, yearEnd: 2010, engineFamilyIds: ['mopar_hemi_57', 'mopar_hemi_61'], trimNote: 'LX Charger R/T (5.7) & SRT-8 (6.1)' },
      { yearStart: 2011, yearEnd: 2023, engineFamilyIds: ['mopar_hemi_57', 'mopar_hemi_64'], trimNote: 'LD Charger R/T (5.7) & Scat Pack / SRT 392 (6.4)' }
    ]
  },

  dodge_challenger: {
    id: 'dodge_challenger',
    brand: 'Chrysler / Mopar',
    make: 'Dodge',
    model: 'Challenger (E-Body Classic & LC Modern)',
    chassisCode: 'E-Body & LC',
    yearStart: 1970,
    yearEnd: 2023,
    category: 'Muscle Car',
    tunnelSize: 'E-Body & LC Performance Tunnel (Fits A727, A833, TR6060/T56, 8HP70)',
    yearEngineOptions: [
      { yearStart: 1970, yearEnd: 1974, engineFamilyIds: ['mopar_la_318', 'mopar_la_340', 'mopar_la_360', 'mopar_b_383', 'mopar_rb_440'], trimNote: 'E-Body T/A 340 & R/T 383/440' },
      { yearStart: 2008, yearEnd: 2010, engineFamilyIds: ['mopar_hemi_57', 'mopar_hemi_61'], trimNote: 'LC R/T (5.7) & SRT-8 (6.1)' },
      { yearStart: 2011, yearEnd: 2023, engineFamilyIds: ['mopar_hemi_57', 'mopar_hemi_64'], trimNote: 'LC R/T (5.7) & Scat Pack / 392 (6.4)' }
    ]
  },

  dodge_dart_duster: {
    id: 'dodge_dart_duster',
    brand: 'Chrysler / Mopar',
    make: 'Dodge / Plymouth',
    model: 'Dart / Demon / Plymouth Duster (A-Body)',
    chassisCode: 'Chrysler A-Body',
    yearStart: 1967,
    yearEnd: 1976,
    category: 'Muscle Car',
    tunnelSize: 'Compact A-Body Tunnel (Fits A904, A500/42RE w/ brace mod, A833; 727 tight)',
    yearEngineOptions: [
      { yearStart: 1967, yearEnd: 1973, engineFamilyIds: ['mopar_la_318', 'mopar_la_340', 'mopar_b_383'], trimNote: 'Dart Swinger 340 / Duster 340 / GTS 383' },
      { yearStart: 1974, yearEnd: 1976, engineFamilyIds: ['mopar_la_318', 'mopar_la_360'], trimNote: 'Dart Sport 360 / Duster 360' }
    ]
  },

  dodge_dakota_durango: {
    id: 'dodge_dakota_durango',
    brand: 'Chrysler / Mopar',
    make: 'Dodge',
    model: 'Dakota / Durango / Ramcharger',
    chassisCode: 'N-Body / DN / WK / WD',
    yearStart: 1974,
    yearEnd: 2026,
    category: 'SUV / 4x4',
    tunnelSize: 'Mid/Full Truck Tunnel (Fits A727, A500/42RE/46RE, 8HP70)',
    yearEngineOptions: [
      { yearStart: 1974, yearEnd: 1993, engineFamilyIds: ['mopar_la_318', 'mopar_la_360', 'mopar_rb_440'], trimNote: 'Ramcharger 4x4' },
      { yearStart: 1989, yearEnd: 2003, engineFamilyIds: ['mopar_la_318', 'mopar_la_360'], trimNote: 'Dakota 5.2L / R/T 5.9L & Durango' },
      { yearStart: 2004, yearEnd: 2026, engineFamilyIds: ['mopar_hemi_57', 'mopar_hemi_64'], trimNote: 'Durango R/T (5.7L) & SRT 392 (6.4L)' }
    ]
  },

  plymouth_cuda_roadrunner: {
    id: 'plymouth_cuda_roadrunner',
    brand: 'Chrysler / Mopar',
    make: 'Plymouth',
    model: 'Barracuda / \'Cuda / Road Runner / GTX',
    chassisCode: 'A-Body / B-Body / E-Body',
    yearStart: 1968,
    yearEnd: 1974,
    category: 'Muscle Car',
    tunnelSize: 'B/E-Body Tunnel (Fits TorqueFlite 727 & A-833 4-Speed natively)',
    yearEngineOptions: [
      { yearStart: 1968, yearEnd: 1971, engineFamilyIds: ['mopar_la_318', 'mopar_la_340', 'mopar_b_383', 'mopar_rb_440'], trimNote: 'Road Runner 383 / GTX 440 / AAR \'Cuda 340' },
      { yearStart: 1972, yearEnd: 1974, engineFamilyIds: ['mopar_la_318', 'mopar_la_340', 'mopar_la_360', 'mopar_rb_440'], trimNote: 'E/B-Body 340 / 360 / 440' }
    ]
  },

  // =========================================================================
  // JEEP / AMC
  // =========================================================================
  jeep_wrangler: {
    id: 'jeep_wrangler',
    brand: 'Jeep / AMC',
    make: 'Jeep',
    model: 'Wrangler (YJ / TJ / LJ / JK / JL)',
    chassisCode: 'YJ / TJ / JK / JL',
    yearStart: 1987,
    yearEnd: 2026,
    category: 'SUV / 4x4',
    tunnelSize: 'Short/Mid 4x4 Tunnel (AX-15, NV3550, 42RLE, W5A580, 850RE)',
    yearEngineOptions: [
      { yearStart: 1991, yearEnd: 2006, engineFamilyIds: ['jeep_40_i6'], trimNote: '4.0L Power-Tech High-Output I6 (1987-90 used 4.2L 258 carb)' },
      { yearStart: 2012, yearEnd: 2026, engineFamilyIds: ['stellantis_36_pentastar'], trimNote: 'JK/JL 3.6L Pentastar V6' }
    ]
  },

  jeep_cherokee_xj: {
    id: 'jeep_cherokee_xj',
    brand: 'Jeep / AMC',
    make: 'Jeep',
    model: 'Cherokee XJ / Comanche MJ',
    chassisCode: 'XJ / MJ Unibody',
    yearStart: 1987,
    yearEnd: 2001,
    category: 'SUV / 4x4',
    tunnelSize: 'XJ Unibody Tunnel (Native AW4 4-speed auto & AX-15 5-speed)',
    yearEngineOptions: [
      { yearStart: 1987, yearEnd: 2001, engineFamilyIds: ['jeep_40_i6'], trimNote: 'Renix (87-90) & High-Output Chrysler MPI (91-01)' }
    ]
  },

  jeep_grand_cherokee: {
    id: 'jeep_grand_cherokee',
    brand: 'Jeep / AMC',
    make: 'Jeep',
    model: 'Grand Cherokee (ZJ / WJ / WK / WK2 / WL)',
    chassisCode: 'ZJ / WJ / WK / WK2 / WL',
    yearStart: 1993,
    yearEnd: 2026,
    category: 'SUV / 4x4',
    tunnelSize: 'Mid-Size SUV Tunnel (42RE, 44RE, 46RE, 545RFE, 8HP70)',
    yearEngineOptions: [
      { yearStart: 1993, yearEnd: 1998, engineFamilyIds: ['jeep_40_i6', 'mopar_la_318', 'mopar_la_360'], trimNote: 'ZJ 4.0L I6, 5.2L V8 & 1998 5.9L Limited' },
      { yearStart: 1999, yearEnd: 2004, engineFamilyIds: ['jeep_40_i6'], trimNote: 'WJ 4.0L Power-Tech I6' },
      { yearStart: 2005, yearEnd: 2010, engineFamilyIds: ['mopar_hemi_57', 'mopar_hemi_61'], trimNote: 'WK 5.7L HEMI & SRT-8 6.1L' },
      { yearStart: 2011, yearEnd: 2021, engineFamilyIds: ['stellantis_36_pentastar', 'mopar_hemi_57', 'mopar_hemi_64'], trimNote: 'WK2 3.6L Pentastar, 5.7L HEMI & SRT 6.4L' },
      { yearStart: 2022, yearEnd: 2026, engineFamilyIds: ['stellantis_36_pentastar', 'mopar_hemi_57'], trimNote: 'WL 3.6L Pentastar & L 5.7L HEMI' }
    ]
  },

  // =========================================================================
  // TOYOTA
  // =========================================================================
  toyota_pickup_hilux: {
    id: 'toyota_pickup_hilux',
    brand: 'Toyota / Lexus',
    make: 'Toyota',
    model: 'Pickup / Hilux (N30–N110)',
    chassisCode: 'RN40 / RN60 / RN80–RN110',
    yearStart: 1981,
    yearEnd: 1995,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Compact Import Truck Tunnel (Native Toyota W56 / G52 / G54 5-Speed)',
    yearEngineOptions: [
      { yearStart: 1981, yearEnd: 1984, engineFamilyIds: ['toyota_22r'], trimNote: 'Early Tall-Deck 22R Carb' },
      { yearStart: 1985, yearEnd: 1995, engineFamilyIds: ['toyota_22r'], trimNote: 'Late Short-Deck 22R / 22R-E EFI' }
    ]
  },

  toyota_4runner_22r: {
    id: 'toyota_4runner_22r',
    brand: 'Toyota / Lexus',
    make: 'Toyota',
    model: '4Runner (1st & 2nd Gen)',
    chassisCode: 'N60 / N120',
    yearStart: 1984,
    yearEnd: 1995,
    category: 'SUV / 4x4',
    tunnelSize: 'Compact 4x4 Tunnel (Native W56 5-Speed & A340H Auto)',
    yearEngineOptions: [
      { yearStart: 1984, yearEnd: 1984, engineFamilyIds: ['toyota_22r'], trimNote: '1984 Removable-Top 22R' },
      { yearStart: 1985, yearEnd: 1995, engineFamilyIds: ['toyota_22r'], trimNote: '1985-95 22R-E EFI' }
    ]
  },

  ...VEHICLE_CATALOG_GLOBAL
};

export const VEHICLE_CATALOG_LIST: VehicleCatalogEntry[] = Object.values(VEHICLE_CATALOG);

export function getCatalogBrands(): EngineBrand[] {
  return ENGINE_BRANDS.filter((brand) =>
    VEHICLE_CATALOG_LIST.some((v) => v.brand === brand)
  );
}

export function getVehiclesForBrand(brand: EngineBrand): VehicleCatalogEntry[] {
  return VEHICLE_CATALOG_LIST.filter((v) => v.brand === brand);
}

export function getValidYearsForVehicle(vehicleId: string): number[] {
  const entry = VEHICLE_CATALOG[vehicleId];
  if (!entry) return [];
  const years = new Set<number>();
  entry.yearEngineOptions.forEach((opt) => {
    for (let y = opt.yearStart; y <= opt.yearEnd; y++) {
      years.add(y);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function getEnginesForVehicleYear(
  vehicleId: string,
  year: number
): { engineFamilyIds: string[]; trimNotes: string[] } {
  const entry = VEHICLE_CATALOG[vehicleId];
  if (!entry) return { engineFamilyIds: [], trimNotes: [] };

  const idSet = new Set<string>();
  const trimNotes: string[] = [];

  entry.yearEngineOptions.forEach((opt) => {
    if (year >= opt.yearStart && year <= opt.yearEnd) {
      opt.engineFamilyIds.forEach((id) => {
        if (ENGINE_FAMILIES[id]) {
          idSet.add(id);
        }
      });
      if (opt.trimNote) {
        trimNotes.push(opt.trimNote);
      }
    }
  });

  return {
    engineFamilyIds: Array.from(idSet),
    trimNotes
  };
}
