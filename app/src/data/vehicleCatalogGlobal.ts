/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VehicleCatalogEntry } from './vehicleCatalog';

export const VEHICLE_CATALOG_GLOBAL: Record<string, VehicleCatalogEntry> = {
  // =========================================================================
  // GM DURAMAX DIESEL & ECOTEC
  // =========================================================================
  chevy_silverado_duramax: {
    id: 'chevy_silverado_duramax',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet / GMC',
    model: 'Silverado / Sierra 2500HD–3500HD Duramax Diesel',
    chassisCode: 'GMT800 / GMT900 / K2XX / T1XX HD',
    yearStart: 2001,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Heavy-Duty Allison 1000 / 10L1000 Diesel Tunnel',
    yearEngineOptions: [
      { yearStart: 2001, yearEnd: 2026, engineFamilyIds: ['gm_duramax_66'], trimNote: 'LB7 / LLY / LBZ / LMM / LML / L5P 6.6L Duramax' }
    ]
  },

  chevy_camaro_ats_20t: {
    id: 'chevy_camaro_ats_20t',
    brand: 'GM / Chevrolet',
    make: 'Chevrolet / Cadillac',
    model: 'Camaro 2.0T / Cadillac ATS & CT4 / Cobalt SS',
    chassisCode: 'Alpha / Delta II',
    yearStart: 2008,
    yearEnd: 2024,
    category: 'Sports Car',
    tunnelSize: 'Compact Alpha / Longitudinal Performance Tunnel',
    yearEngineOptions: [
      { yearStart: 2008, yearEnd: 2024, engineFamilyIds: ['gm_ecotec_20t'], trimNote: 'LNF (Cobalt SS) & LTG (ATS / Camaro 2.0T)' }
    ]
  },

  // =========================================================================
  // PONTIAC / OLDSMOBILE / BUICK
  // =========================================================================
  pontiac_gto_firebird: {
    id: 'pontiac_gto_firebird',
    brand: 'Pontiac / Oldsmobile / Buick',
    make: 'Pontiac',
    model: 'GTO / Firebird / Trans Am (Traditional Pontiac V8)',
    chassisCode: 'GM A-Body & F-Body',
    yearStart: 1967,
    yearEnd: 1979,
    category: 'Muscle Car',
    tunnelSize: 'Classic GM A/F-Body Tunnel (Fits BOP TH400, 200-4R, Super T-10)',
    yearEngineOptions: [
      { yearStart: 1967, yearEnd: 1969, engineFamilyIds: ['pontiac_400'], trimNote: 'GTO / Firebird 400 (Ram Air III)' },
      { yearStart: 1970, yearEnd: 1976, engineFamilyIds: ['pontiac_400', 'pontiac_455'], trimNote: 'GTO / Trans Am 455 H.O. & SD-455' },
      { yearStart: 1977, yearEnd: 1979, engineFamilyIds: ['pontiac_400'], trimNote: 'Trans Am W72 400' }
    ]
  },

  oldsmobile_442_cutlass: {
    id: 'oldsmobile_442_cutlass',
    brand: 'Pontiac / Oldsmobile / Buick',
    make: 'Oldsmobile',
    model: '442 / Cutlass / Hurst/Olds',
    chassisCode: 'GM A-Body',
    yearStart: 1968,
    yearEnd: 1976,
    category: 'Muscle Car',
    tunnelSize: 'GM A-Body Tunnel (Fits BOP TH400, 200-4R, Muncie)',
    yearEngineOptions: [
      { yearStart: 1968, yearEnd: 1976, engineFamilyIds: ['olds_455_rocket'], trimNote: '455 Rocket & W-30' }
    ]
  },

  buick_grand_national: {
    id: 'buick_grand_national',
    brand: 'Pontiac / Oldsmobile / Buick',
    make: 'Buick',
    model: 'Regal Grand National / T-Type / GNX',
    chassisCode: 'GM G-Body',
    yearStart: 1986,
    yearEnd: 1987,
    category: 'Muscle Car',
    tunnelSize: 'GM G-Body Tunnel (Native TH200-4R Overdrive)',
    yearEngineOptions: [
      { yearStart: 1986, yearEnd: 1987, engineFamilyIds: ['buick_3800_turbo'], trimNote: 'LC2 Intercooled 3.8L SFI Turbo V6' }
    ]
  },

  // =========================================================================
  // FORD DIESELS, ECOBOOST & SHELBY VOODOO
  // =========================================================================
  ford_super_duty_diesel: {
    id: 'ford_super_duty_diesel',
    brand: 'Ford',
    make: 'Ford',
    model: 'F-250 / F-350 / F-450 Super Duty Power Stroke',
    chassisCode: 'OBS HD & P131–P708 Super Duty',
    yearStart: 1994,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Heavy-Duty Super Duty Tunnel (Fits E4OD, 4R100, 6R140, 10R140)',
    yearEngineOptions: [
      { yearStart: 1994, yearEnd: 2003, engineFamilyIds: ['ford_73_powerstroke'], trimNote: '7.3L Power Stroke HEUI' },
      { yearStart: 2011, yearEnd: 2026, engineFamilyIds: ['ford_67_powerstroke'], trimNote: '6.7L Scorpion Power Stroke' }
    ]
  },

  ford_f150_raptor_ecoboost: {
    id: 'ford_f150_raptor_ecoboost',
    brand: 'Ford',
    make: 'Ford',
    model: 'F-150 EcoBoost / F-150 Raptor / Ford GT',
    chassisCode: 'P415 / P552 / P702',
    yearStart: 2011,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Modern Full-Size Truck Tunnel (6R80 / 10R80)',
    yearEngineOptions: [
      { yearStart: 2011, yearEnd: 2026, engineFamilyIds: ['ford_35_ecoboost'], trimNote: '3.5L EcoBoost & Raptor H.O.' }
    ]
  },

  ford_mustang_ecoboost_gt350: {
    id: 'ford_mustang_ecoboost_gt350',
    brand: 'Ford',
    make: 'Ford',
    model: 'Mustang EcoBoost / Shelby GT350 / Bronco 2.3T',
    chassisCode: 'S550 / S650 / U725',
    yearStart: 2015,
    yearEnd: 2026,
    category: 'Muscle Car',
    tunnelSize: 'S550/S650 Performance Tunnel (MT82, TR-3160, 10R80)',
    yearEngineOptions: [
      { yearStart: 2015, yearEnd: 2020, engineFamilyIds: ['ford_23_ecoboost', 'ford_52_voodoo'], trimNote: '2.3L EcoBoost & Shelby GT350 5.2L Voodoo' },
      { yearStart: 2021, yearEnd: 2026, engineFamilyIds: ['ford_23_ecoboost'], trimNote: '2.3L EcoBoost Mustang & Bronco' }
    ]
  },

  // =========================================================================
  // CHRYSLER / MOPAR / CUMMINS / VIPER / PENTASTAR / JEEP
  // =========================================================================
  ram_hd_cummins: {
    id: 'ram_hd_cummins',
    brand: 'Chrysler / Mopar',
    make: 'Dodge / Ram',
    model: 'Ram 2500 / 3500 Heavy Duty Cummins',
    chassisCode: 'DH / D1 / DJ / D2',
    yearStart: 2007,
    yearEnd: 2026,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Heavy-Duty Cummins Tunnel (68RFE, Aisin AS69RC, G56)',
    yearEngineOptions: [
      { yearStart: 2007, yearEnd: 2026, engineFamilyIds: ['mopar_cummins_67'], trimNote: '6.7L ISB Cummins Turbodiesel' }
    ]
  },

  dodge_hellcat_lineup: {
    id: 'dodge_hellcat_lineup',
    brand: 'Chrysler / Mopar',
    make: 'Dodge / Jeep / Ram',
    model: 'Charger / Challenger Hellcat / Trackhawk / TRX',
    chassisCode: 'LD / LC / WK2 / DT',
    yearStart: 2015,
    yearEnd: 2024,
    category: 'Muscle Car',
    tunnelSize: 'Wide Performance Tunnel (ZF 8HP90 / TR-6060)',
    yearEngineOptions: [
      { yearStart: 2015, yearEnd: 2024, engineFamilyIds: ['mopar_hellcat_62', 'stellantis_36_pentastar'], trimNote: '6.2L Supercharged Hellcat & 3.6L Pentastar Base' }
    ]
  },

  dodge_viper_srt: {
    id: 'dodge_viper_srt',
    brand: 'Chrysler / Mopar',
    make: 'Dodge / SRT',
    model: 'Viper SRT-10 / ACR (Gen IV & Gen V)',
    chassisCode: 'ZB II / VX I',
    yearStart: 2008,
    yearEnd: 2017,
    category: 'Sports Car',
    tunnelSize: 'Wide Carbon/Steel Backbone Tunnel (TR-6060 6-Speed)',
    yearEngineOptions: [
      { yearStart: 2008, yearEnd: 2017, engineFamilyIds: ['dodge_viper_84_v10'], trimNote: '8.4L All-Aluminum V10' }
    ]
  },

  jeep_wagoneer_hurricane: {
    id: 'jeep_wagoneer_hurricane',
    brand: 'Jeep / AMC',
    make: 'Jeep / AMC',
    model: 'Grand Wagoneer / Cherokee SJ / J10 / Wrangler Pentastar',
    chassisCode: 'SJ / WS / JL',
    yearStart: 1970,
    yearEnd: 2026,
    category: 'SUV / 4x4',
    tunnelSize: 'Full-Size 4x4 Tunnel (TH400, A727, ZF 8HP75)',
    yearEngineOptions: [
      { yearStart: 1970, yearEnd: 1991, engineFamilyIds: ['amc_360_v8'], trimNote: 'SJ Wagoneer / J-Truck AMC 360 V8' },
      { yearStart: 2022, yearEnd: 2026, engineFamilyIds: ['stellantis_30_hurricane'], trimNote: 'WS Wagoneer & Ram 1500 3.0L Hurricane TT I6' }
    ]
  },

  // =========================================================================
  // TOYOTA / LEXUS
  // =========================================================================
  toyota_supra_mk4: {
    id: 'toyota_supra_mk4',
    brand: 'Toyota / Lexus',
    make: 'Toyota',
    model: 'Supra (A80 MK4 Twin-Turbo) / Aristo',
    chassisCode: 'JZA80',
    yearStart: 1993,
    yearEnd: 2002,
    category: 'Sports Car',
    tunnelSize: 'JZA80 Tunnel (Native Getrag V160 6-Speed & A340E)',
    yearEngineOptions: [
      { yearStart: 1993, yearEnd: 2002, engineFamilyIds: ['toyota_2jz_gte'], trimNote: '2JZ-GTE 3.0L Sequential Twin-Turbo' }
    ]
  },

  lexus_ls400_sc400: {
    id: 'lexus_ls400_sc400',
    brand: 'Toyota / Lexus',
    make: 'Lexus',
    model: 'LS400 / SC400 / GS400',
    chassisCode: 'UCF10–UCF20 / JZZ30 / UZS160',
    yearStart: 1989,
    yearEnd: 2000,
    category: 'Sedan / Fleet',
    tunnelSize: 'Longitudinal Luxury Tunnel (A340E / A650E)',
    yearEngineOptions: [
      { yearStart: 1989, yearEnd: 2000, engineFamilyIds: ['toyota_1uz_fe'], trimNote: '1UZ-FE 4.0L Quad-Cam V8' }
    ]
  },

  toyota_tundra_landcruiser: {
    id: 'toyota_tundra_landcruiser',
    brand: 'Toyota / Lexus',
    make: 'Toyota / Lexus',
    model: 'Tundra / Sequoia / Land Cruiser 200 / LX570',
    chassisCode: 'XK50 / URJ200',
    yearStart: 2007,
    yearEnd: 2021,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Full-Size Truck Tunnel (Aisin AB60E / AB60F 6-Speed)',
    yearEngineOptions: [
      { yearStart: 2007, yearEnd: 2021, engineFamilyIds: ['toyota_3ur_fe'], trimNote: '3UR-FE 5.7L i-FORCE V8' }
    ]
  },

  toyota_prius_corolla_hybrid: {
    id: 'toyota_prius_corolla_hybrid',
    brand: 'Toyota / Lexus',
    make: 'Toyota',
    model: 'Prius / Corolla Hybrid (Atkinson Hybrid)',
    chassisCode: 'XW30 / XW50 / E210',
    yearStart: 2010,
    yearEnd: 2026,
    category: 'Sedan / Fleet',
    tunnelSize: 'Transverse Hybrid Synergy Drive e-CVT Transaxle',
    yearEngineOptions: [
      { yearStart: 2010, yearEnd: 2026, engineFamilyIds: ['toyota_2zr_fxe_hybrid'], trimNote: '2ZR-FXE 1.8L Atkinson Hybrid' }
    ]
  },

  toyota_gr_corolla: {
    id: 'toyota_gr_corolla',
    brand: 'Toyota / Lexus',
    make: 'Toyota',
    model: 'GR Corolla / GR Yaris',
    chassisCode: 'GZEA14 / GXPA16',
    yearStart: 2020,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'Transverse GR-FOUR AWD 6MT / 8-Speed DAT',
    yearEngineOptions: [
      { yearStart: 2020, yearEnd: 2026, engineFamilyIds: ['toyota_g16e_gts'], trimNote: 'G16E-GTS 1.6L Turbo Inline-3' }
    ]
  },

  // =========================================================================
  // HONDA / ACURA
  // =========================================================================
  honda_civic_type_r_integra: {
    id: 'honda_civic_type_r_integra',
    brand: 'Honda / Acura',
    make: 'Honda / Acura',
    model: 'Civic Type R (FK8 / FL5) / Integra Type S / TSX',
    chassisCode: 'FK8 / FL5 / DE5 / CL9',
    yearStart: 2004,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'Transverse Front-Drive Performance Transaxle',
    yearEngineOptions: [
      { yearStart: 2004, yearEnd: 2015, engineFamilyIds: ['honda_k24a2'], trimNote: 'Acura TSX / Civic Si K24 i-VTEC' },
      { yearStart: 2017, yearEnd: 2026, engineFamilyIds: ['honda_k20c1'], trimNote: 'K20C1 2.0L VTEC Turbo' }
    ]
  },

  honda_s2000: {
    id: 'honda_s2000',
    brand: 'Honda / Acura',
    make: 'Honda',
    model: 'S2000 (AP1 / AP2)',
    chassisCode: 'AP1 / AP2',
    yearStart: 1999,
    yearEnd: 2009,
    category: 'Sports Car',
    tunnelSize: 'High X-Bone Frame Tunnel (Longitudinal 6-Speed RWD)',
    yearEngineOptions: [
      { yearStart: 1999, yearEnd: 2009, engineFamilyIds: ['honda_f20c'], trimNote: 'F20C 9,000 RPM (99-03) & F22C1 (04-09)' }
    ]
  },

  honda_accord_odyssey_v6: {
    id: 'honda_accord_odyssey_v6',
    brand: 'Honda / Acura',
    make: 'Honda / Acura',
    model: 'Accord V6 / Odyssey / Pilot / Acura TLX & MDX',
    chassisCode: 'J-Series Platform',
    yearStart: 1999,
    yearEnd: 2026,
    category: 'Sedan / Fleet',
    tunnelSize: 'Transverse V6 6MT / 6AT / 10AT Transaxle',
    yearEngineOptions: [
      { yearStart: 1999, yearEnd: 2026, engineFamilyIds: ['honda_j35'], trimNote: 'J35 3.5L i-VTEC V6' }
    ]
  },

  acura_nsx_nc1: {
    id: 'acura_nsx_nc1',
    brand: 'Honda / Acura',
    make: 'Acura / Honda',
    model: 'NSX (NC1 Sport Hybrid SH-AWD)',
    chassisCode: 'NC1',
    yearStart: 2017,
    yearEnd: 2022,
    category: 'Sports Car',
    tunnelSize: 'Mid-Engine 9-Speed Dual-Clutch Transaxle',
    yearEngineOptions: [
      { yearStart: 2017, yearEnd: 2022, engineFamilyIds: ['honda_jnc1_nsx'], trimNote: 'JNC1 3.5L Twin-Turbo Hybrid V6' }
    ]
  },

  // =========================================================================
  // NISSAN / INFINITI
  // =========================================================================
  nissan_skyline_gtr: {
    id: 'nissan_skyline_gtr',
    brand: 'Nissan / Infiniti',
    make: 'Nissan',
    model: 'Skyline GT-R (R32 / R33 / R34)',
    chassisCode: 'BNR32 / BCNR33 / BNR34',
    yearStart: 1989,
    yearEnd: 2002,
    category: 'Sports Car',
    tunnelSize: 'ATTESA E-TS AWD Tunnel (FS5R30A 5MT / Getrag 233 6MT)',
    yearEngineOptions: [
      { yearStart: 1989, yearEnd: 2002, engineFamilyIds: ['nissan_rb26dett'], trimNote: 'RB26DETT 2.6L Twin-Turbo I6' }
    ]
  },

  nissan_370z_g37: {
    id: 'nissan_370z_g37',
    brand: 'Nissan / Infiniti',
    make: 'Nissan / Infiniti',
    model: '370Z / Infiniti G37 / Q50 / Q60',
    chassisCode: 'Z34 / V36',
    yearStart: 2008,
    yearEnd: 2020,
    category: 'Sports Car',
    tunnelSize: 'FM-Platform Tunnel (Native CD009 / JK40C 6-Speed)',
    yearEngineOptions: [
      { yearStart: 2008, yearEnd: 2020, engineFamilyIds: ['nissan_vq37vhr'], trimNote: 'VQ37VHR 3.7L VVEL V6' }
    ]
  },

  nissan_gtr_r35: {
    id: 'nissan_gtr_r35',
    brand: 'Nissan / Infiniti',
    make: 'Nissan',
    model: 'GT-R (R35)',
    chassisCode: 'CBA / DBA / R35',
    yearStart: 2007,
    yearEnd: 2024,
    category: 'Sports Car',
    tunnelSize: 'PM-Platform Carbon Driveshaft Tunnel + Rear GR6 6DCT Transaxle',
    yearEngineOptions: [
      { yearStart: 2007, yearEnd: 2024, engineFamilyIds: ['nissan_vr38dett'], trimNote: 'VR38DETT 3.8L Twin-Turbo V6' }
    ]
  },

  nissan_titan_armada: {
    id: 'nissan_titan_armada',
    brand: 'Nissan / Infiniti',
    make: 'Nissan / Infiniti',
    model: 'Titan / Armada / Infiniti QX80',
    chassisCode: 'A60 / A61 / Y62',
    yearStart: 2010,
    yearEnd: 2024,
    category: 'Pickup / Work Truck',
    tunnelSize: 'Full-Size Truck Tunnel (Jatco 7-Speed / 9-Speed)',
    yearEngineOptions: [
      { yearStart: 2010, yearEnd: 2024, engineFamilyIds: ['nissan_vk56vd'], trimNote: 'VK56VD 5.6L Endurance V8' }
    ]
  },

  // =========================================================================
  // SUBARU
  // =========================================================================
  subaru_wrx_sti: {
    id: 'subaru_wrx_sti',
    brand: 'Subaru',
    make: 'Subaru',
    model: 'Impreza WRX STI / BRZ / Outback 3.6R',
    chassisCode: 'GD / GR / VA / ZC6 / ZD8 / BS',
    yearStart: 2004,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'Longitudinal Boxer AWD/RWD Tunnel (TY85 6MT / TL70 / CVT)',
    yearEngineOptions: [
      { yearStart: 2004, yearEnd: 2009, engineFamilyIds: ['subaru_ej257'], trimNote: 'WRX STI EJ257 2.5L Turbo Boxer H4' },
      { yearStart: 2010, yearEnd: 2019, engineFamilyIds: ['subaru_ej257', 'subaru_ez36'], trimNote: 'WRX STI (EJ257) & Outback/Legacy 3.6R (EZ36 H6)' },
      { yearStart: 2020, yearEnd: 2021, engineFamilyIds: ['subaru_ej257', 'subaru_fa24'], trimNote: 'Final EJ257 STI & FA24F Ascent/Outback XT' },
      { yearStart: 2022, yearEnd: 2026, engineFamilyIds: ['subaru_fa24'], trimNote: 'BRZ / GR86 (FA24D) & VB WRX (FA24F)' }
    ]
  },

  // =========================================================================
  // MAZDA
  // =========================================================================
  mazda_rx7_fd: {
    id: 'mazda_rx7_fd',
    brand: 'Mazda',
    make: 'Mazda',
    model: 'RX-7 (FD3S Twin-Turbo Rotary)',
    chassisCode: 'FD3S',
    yearStart: 1992,
    yearEnd: 2002,
    category: 'Sports Car',
    tunnelSize: 'Backbone Power-Plant Frame (PPF) Tunnel',
    yearEngineOptions: [
      { yearStart: 1992, yearEnd: 2002, engineFamilyIds: ['mazda_13b_rew'], trimNote: '13B-REW Twin-Rotor Sequential Twin-Turbo' }
    ]
  },

  mazda_cx90_cx70: {
    id: 'mazda_cx90_cx70',
    brand: 'Mazda',
    make: 'Mazda',
    model: 'CX-90 / CX-70 (Longitudinal Inline-6)',
    chassisCode: 'Large Architecture',
    yearStart: 2023,
    yearEnd: 2026,
    category: 'SUV / 4x4',
    tunnelSize: 'Longitudinal AWD 8-Speed Wet-Clutch Tunnel',
    yearEngineOptions: [
      { yearStart: 2023, yearEnd: 2026, engineFamilyIds: ['mazda_skyactiv_33t'], trimNote: '3.3L e-Skyactiv-G Turbo Inline-6' }
    ]
  },

  // =========================================================================
  // MITSUBISHI
  // =========================================================================
  mitsubishi_lancer_evo: {
    id: 'mitsubishi_lancer_evo',
    brand: 'Mitsubishi',
    make: 'Mitsubishi',
    model: 'Lancer Evolution (I–IX) / Eclipse GSX',
    chassisCode: 'CT9A / DSM 1G–2G',
    yearStart: 1990,
    yearEnd: 2007,
    category: 'Sports Car',
    tunnelSize: 'Transverse AWD 5MT/6MT Transfer Case Packaging',
    yearEngineOptions: [
      { yearStart: 1990, yearEnd: 2007, engineFamilyIds: ['mitsubishi_4g63t'], trimNote: '4G63T 2.0L DOHC Turbo I4' }
    ]
  },

  // =========================================================================
  // HYUNDAI / KIA / GENESIS
  // =========================================================================
  genesis_kia_performance: {
    id: 'genesis_kia_performance',
    brand: 'Hyundai / Kia / Genesis',
    make: 'Genesis / Kia / Hyundai',
    model: 'Kia Stinger GT / Genesis G70 3.3T / Sonata N-Line / K5 GT',
    chassisCode: 'CK / IK / DN8 / DL3',
    yearStart: 2017,
    yearEnd: 2026,
    category: 'Sedan / Fleet',
    tunnelSize: 'Longitudinal RWD/AWD 8AT (3.3T) & Transverse 8DCT (2.5T)',
    yearEngineOptions: [
      { yearStart: 2017, yearEnd: 2019, engineFamilyIds: ['hyundai_lambda_33t'], trimNote: 'Stinger GT / Genesis G70 3.3L Twin-Turbo' },
      { yearStart: 2020, yearEnd: 2026, engineFamilyIds: ['hyundai_lambda_33t', 'hyundai_theta_25t'], trimNote: '3.3T Lambda II & 2.5T Smartstream' }
    ]
  },

  // =========================================================================
  // BMW / MINI
  // =========================================================================
  bmw_m3_m340i_m5: {
    id: 'bmw_m3_m340i_m5',
    brand: 'BMW / MINI',
    make: 'BMW',
    model: 'M3 (E46) / M5 (E60 V10) / M340i / M240i',
    chassisCode: 'E46 / E60 / G20 / G42',
    yearStart: 2001,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'BMW Longitudinal Tunnel (Getrag 420G, SMG III, ZF 8HP50)',
    yearEngineOptions: [
      { yearStart: 2001, yearEnd: 2008, engineFamilyIds: ['bmw_s54'], trimNote: 'E46 M3 / Z4 M (S54 3.2L I6)' },
      { yearStart: 2005, yearEnd: 2010, engineFamilyIds: ['bmw_s85_v10'], trimNote: 'E60 M5 / E63 M6 (S85 5.0L V10)' },
      { yearStart: 2015, yearEnd: 2026, engineFamilyIds: ['bmw_b58'], trimNote: '340i / M340i / X3 M40i / GR Supra (B58 3.0T)' }
    ]
  },

  // =========================================================================
  // MERCEDES-BENZ / AMG
  // =========================================================================
  mercedes_amg_c63_e63_sprinter: {
    id: 'mercedes_amg_c63_e63_sprinter',
    brand: 'Mercedes-Benz / AMG',
    make: 'Mercedes-AMG / Mercedes-Benz',
    model: 'C63 & E63 AMG (M156 / M177) / Sprinter OM642 Diesel',
    chassisCode: 'W204 / W205 / W212 / NCV3–VS30',
    yearStart: 2005,
    yearEnd: 2026,
    category: 'Sedan / Fleet',
    tunnelSize: 'Mercedes Longitudinal Tunnel (7G-MCT, 9G-MCT, 722.9)',
    yearEngineOptions: [
      { yearStart: 2005, yearEnd: 2005, engineFamilyIds: ['mercedes_om642_diesel'], trimNote: 'OM642 3.0L V6 Turbodiesel' },
      { yearStart: 2006, yearEnd: 2014, engineFamilyIds: ['mercedes_m156_amg', 'mercedes_om642_diesel'], trimNote: 'C63/E63 M156 6.2L V8 & Sprinter/E320 OM642' },
      { yearStart: 2015, yearEnd: 2026, engineFamilyIds: ['mercedes_m177_biturbo', 'mercedes_om642_diesel'], trimNote: 'M177 4.0L Biturbo & Sprinter OM642 (thru 2023)' }
    ]
  },

  // =========================================================================
  // VOLKSWAGEN / AUDI / PORSCHE / BENTLEY
  // =========================================================================
  vw_golf_gti_r_vr6: {
    id: 'vw_golf_gti_r_vr6',
    brand: 'Volkswagen / Audi / Porsche',
    make: 'Volkswagen',
    model: 'Golf GTI / Golf R / Passat R36 / Atlas VR6',
    chassisCode: 'PQ35 / MQB / B6–CA',
    yearStart: 2006,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'Transverse FWD/AWD DSG & 6-Speed Transaxle',
    yearEngineOptions: [
      { yearStart: 2006, yearEnd: 2007, engineFamilyIds: ['vw_vr6_36'], trimNote: 'Passat / R36 3.6L VR6' },
      { yearStart: 2008, yearEnd: 2023, engineFamilyIds: ['vw_ea888_20t', 'vw_vr6_36'], trimNote: 'GTI/Golf R (EA888 2.0T) & CC/Atlas (3.6L VR6)' },
      { yearStart: 2024, yearEnd: 2026, engineFamilyIds: ['vw_ea888_20t'], trimNote: 'Mk8 GTI & Golf R (EA888 Gen 4)' }
    ]
  },

  audi_rs3_r8_v10: {
    id: 'audi_rs3_r8_v10',
    brand: 'Volkswagen / Audi / Porsche',
    make: 'Audi',
    model: 'RS3 / TT RS (2.5T I5) & R8 V10 Performance',
    chassisCode: '8V / 8Y / 42 / 4S',
    yearStart: 2009,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'Quattro Transverse DQ500 (RS3) / Mid-Engine DL800 (R8)',
    yearEngineOptions: [
      { yearStart: 2009, yearEnd: 2016, engineFamilyIds: ['audi_52_v10_fsi'], trimNote: 'R8 5.2L V10 FSI' },
      { yearStart: 2017, yearEnd: 2024, engineFamilyIds: ['audi_25_tfsi_i5', 'audi_52_v10_fsi'], trimNote: 'RS3/TT RS (2.5T I5) & R8 V10' },
      { yearStart: 2025, yearEnd: 2026, engineFamilyIds: ['audi_25_tfsi_i5'], trimNote: '8Y.5 RS3 2.5L Turbo I5' }
    ]
  },

  bentley_continental_w12: {
    id: 'bentley_continental_w12',
    brand: 'Volkswagen / Audi / Porsche',
    make: 'Bentley / VW',
    model: 'Continental GT / Flying Spur / Bentayga / Phaeton W12',
    chassisCode: '3W / 3S / D1',
    yearStart: 2003,
    yearEnd: 2024,
    category: 'Sedan / Fleet',
    tunnelSize: 'AWD Luxury Tunnel (ZF 6HP26 / 8HP90 / 8-Speed DCT)',
    yearEngineOptions: [
      { yearStart: 2003, yearEnd: 2024, engineFamilyIds: ['vw_bentley_w12'], trimNote: '6.0L Twin-Turbo W12' }
    ]
  },

  porsche_911_gt3: {
    id: 'porsche_911_gt3',
    brand: 'Volkswagen / Audi / Porsche',
    make: 'Porsche',
    model: '911 GT3 / GT3 RS / 718 Cayman GT4 RS (4.0L H6)',
    chassisCode: '991.2 / 992 / 982',
    yearStart: 2017,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'Rear/Mid-Engine 7-Speed PDK or 6-Speed GT Sport Manual',
    yearEngineOptions: [
      { yearStart: 2017, yearEnd: 2026, engineFamilyIds: ['porsche_40_h6'], trimNote: '4.0L 9,000-RPM Flat-6 Boxer' }
    ]
  },

  // =========================================================================
  // VOLVO
  // =========================================================================
  volvo_s60r_xc90: {
    id: 'volvo_s60r_xc90',
    brand: 'Volvo',
    make: 'Volvo',
    model: 'S60R / V70R (2.5T I5) & XC90 / S80 V8',
    chassisCode: 'P2 / P3',
    yearStart: 2003,
    yearEnd: 2016,
    category: 'Sedan / Fleet',
    tunnelSize: 'Transverse AWD (M66 6MT / Aisin TF-80SC 6AT)',
    yearEngineOptions: [
      { yearStart: 2003, yearEnd: 2004, engineFamilyIds: ['volvo_b5254t_i5'], trimNote: 'S60R / V70R 2.5T I5' },
      { yearStart: 2005, yearEnd: 2011, engineFamilyIds: ['volvo_b5254t_i5', 'volvo_b8444s_v8'], trimNote: '2.5T I5 & XC90/S80 Yamaha 4.4L V8' },
      { yearStart: 2012, yearEnd: 2016, engineFamilyIds: ['volvo_b5254t_i5'], trimNote: 'S60/V60 T5 2.5T Whiteblock I5' }
    ]
  },

  // =========================================================================
  // EXOTIC & BRITISH (FERRARI / LAMBORGHINI / JAGUAR LAND ROVER)
  // =========================================================================
  ferrari_812_488_f8: {
    id: 'ferrari_812_488_f8',
    brand: 'Exotic & British (Ferrari / Lambo / JLR)',
    make: 'Ferrari',
    model: '812 Superfast (6.5L V12) & 488 GTB / F8 Tributo (3.9T V8)',
    chassisCode: 'F152M / F142M',
    yearStart: 2015,
    yearEnd: 2026,
    category: 'Sports Car',
    tunnelSize: 'Getrag 7DCL750 7-Speed F1 Dual-Clutch Rear Transaxle',
    yearEngineOptions: [
      { yearStart: 2015, yearEnd: 2016, engineFamilyIds: ['ferrari_f154_v8'], trimNote: '488 GTB F154 3.9L TT V8' },
      { yearStart: 2017, yearEnd: 2024, engineFamilyIds: ['ferrari_f140_v12', 'ferrari_f154_v8'], trimNote: '812 Superfast (F140 V12) & 488/F8 (F154 V8)' },
      { yearStart: 2025, yearEnd: 2026, engineFamilyIds: ['ferrari_f140_v12'], trimNote: '12Cilindri F140HD 6.5L V12' }
    ]
  },

  lamborghini_aventador: {
    id: 'lamborghini_aventador',
    brand: 'Exotic & British (Ferrari / Lambo / JLR)',
    make: 'Lamborghini',
    model: 'Aventador (LP700-4 / SV / S / SVJ)',
    chassisCode: 'LB834 / LB835',
    yearStart: 2011,
    yearEnd: 2022,
    category: 'Sports Car',
    tunnelSize: 'Carbon Monocoque Central Tunnel w/ Forward Graziano ISR 7-Speed',
    yearEngineOptions: [
      { yearStart: 2011, yearEnd: 2022, engineFamilyIds: ['lamborghini_l539_v12'], trimNote: 'L539 6.5L 60° V12' }
    ]
  },

  jlr_ftype_range_rover: {
    id: 'jlr_ftype_range_rover',
    brand: 'Exotic & British (Ferrari / Lambo / JLR)',
    make: 'Jaguar / Land Rover',
    model: 'Jaguar F-Type R / XFR & Range Rover Sport SVR (5.0L SC)',
    chassisCode: 'X152 / X250 / L405 / L494',
    yearStart: 2009,
    yearEnd: 2025,
    category: 'Sports Car',
    tunnelSize: 'Longitudinal ZF 8HP70 8-Speed Automatic Tunnel',
    yearEngineOptions: [
      { yearStart: 2009, yearEnd: 2025, engineFamilyIds: ['jlr_aj133_50_sc'], trimNote: 'AJ133 5.0L Supercharged V8' }
    ]
  }
};
