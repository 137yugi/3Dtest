window.MAP_PORTAL_DATA = {
  tags: [
    {
      id: "tag_business_dx",
      name: "DX事業",
      group: "事業",
      color: "#36cfc9"
    },
    {
      id: "tag_business_green",
      name: "グリーン事業",
      group: "事業",
      color: "#66bb6a"
    },
    {
      id: "tag_partner_strategic",
      name: "戦略パートナー",
      group: "パートナー",
      color: "#ffb454"
    },
    {
      id: "tag_priority_a",
      name: "優先度A",
      group: "運用",
      color: "#ff6b6b"
    },
    {
      id: "tag_phase_active",
      name: "進行中",
      group: "案件",
      color: "#7aa8ff"
    },
    {
      id: "tag_public",
      name: "公開可能",
      group: "公開設定",
      color: "#d182ff"
    }
  ],
  locations: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [122.0, 24.0],
            [146.0, 24.0],
            [146.0, 46.0],
            [122.0, 46.0],
            [122.0, 24.0]
          ]]
        },
        properties: {
          id: "loc_country_japan",
          type: "country",
          name: "日本",
          code: "JP",
          scopes: ["world", "japan"],
          tags: ["tag_business_dx", "tag_public"],
          description: "日本全体の表示領域。都道府県・自治体・拠点レイヤの親情報として利用。",
          partners: ["p_001", "p_002", "p_003"],
          centroid: [138.0, 36.2]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-125.0, 24.0],
            [-66.0, 24.0],
            [-66.0, 49.0],
            [-125.0, 49.0],
            [-125.0, 24.0]
          ]]
        },
        properties: {
          id: "loc_country_usa",
          type: "country",
          name: "アメリカ合衆国",
          code: "US",
          scopes: ["world"],
          tags: ["tag_partner_strategic"],
          description: "海外展開先の例。世界地図表示時に確認できる。",
          partners: ["p_010"],
          centroid: [-98.3, 39.7]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [103.6, 1.16],
            [104.05, 1.16],
            [104.05, 1.5],
            [103.6, 1.5],
            [103.6, 1.16]
          ]]
        },
        properties: {
          id: "loc_country_singapore",
          type: "country",
          name: "シンガポール",
          code: "SG",
          scopes: ["world"],
          tags: ["tag_business_green", "tag_phase_active"],
          description: "ASEAN向け連携拠点（例示データ）。",
          partners: ["p_011"],
          centroid: [103.82, 1.35]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [138.75, 35.2],
            [140.2, 35.2],
            [140.2, 36.1],
            [138.75, 36.1],
            [138.75, 35.2]
          ]]
        },
        properties: {
          id: "loc_pref_tokyo",
          type: "prefecture",
          name: "東京都",
          code: "JP-13",
          scopes: ["japan"],
          tags: ["tag_business_dx", "tag_priority_a", "tag_phase_active"],
          description: "首都圏の主要案件エリア。",
          partners: ["p_001", "p_002"],
          centroid: [139.75, 35.68]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [134.2, 34.1],
            [136.0, 34.1],
            [136.0, 35.1],
            [134.2, 35.1],
            [134.2, 34.1]
          ]]
        },
        properties: {
          id: "loc_pref_osaka",
          type: "prefecture",
          name: "大阪府",
          code: "JP-27",
          scopes: ["japan"],
          tags: ["tag_business_green", "tag_phase_active"],
          description: "関西圏オペレーション拠点。",
          partners: ["p_003"],
          centroid: [135.45, 34.69]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [139.66, 35.63],
            [139.74, 35.63],
            [139.74, 35.70],
            [139.66, 35.70],
            [139.66, 35.63]
          ]]
        },
        properties: {
          id: "loc_muni_shibuya",
          type: "municipality",
          name: "渋谷区",
          code: "13113",
          scopes: ["japan"],
          tags: ["tag_business_dx", "tag_public"],
          description: "都市型スマートサービス実証エリア。",
          partners: ["p_001", "p_004"],
          centroid: [139.70, 35.66]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [134.4, 33.9],
            [136.9, 33.9],
            [136.9, 35.7],
            [134.4, 35.7],
            [134.4, 33.9]
          ]]
        },
        properties: {
          id: "loc_area_kansai",
          type: "area",
          name: "関西重点エリア",
          code: "AREA-KANSAI",
          scopes: ["japan"],
          tags: ["tag_business_green", "tag_priority_a"],
          description: "広域施策管理用の任意エリア。",
          partners: ["p_003"],
          centroid: [135.62, 34.8]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [139.6917, 35.6895]
        },
        properties: {
          id: "loc_site_tokyo_hq",
          type: "site",
          name: "東京本社",
          code: "SITE-TYO-001",
          scopes: ["japan"],
          tags: ["tag_business_dx", "tag_priority_a", "tag_phase_active"],
          description: "全社統括拠点。災害時バックアップ運用を含む。",
          partners: ["p_001", "p_002"],
          centroid: [139.6917, 35.6895]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [135.5023, 34.6937]
        },
        properties: {
          id: "loc_site_osaka_lab",
          type: "site",
          name: "大阪ラボ",
          code: "SITE-OSA-003",
          scopes: ["japan"],
          tags: ["tag_business_green", "tag_phase_active"],
          description: "新規実証案件の試験運用拠点。",
          partners: ["p_003"],
          centroid: [135.5023, 34.6937]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [141.3545, 43.0621]
        },
        properties: {
          id: "loc_site_sapporo_dc",
          type: "site",
          name: "札幌データセンター",
          code: "SITE-SPK-008",
          scopes: ["japan"],
          tags: ["tag_public"],
          description: "災害対策用の遠隔バックアップセンター。",
          partners: [],
          centroid: [141.3545, 43.0621]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [130.4017, 33.5902]
        },
        properties: {
          id: "loc_site_fukuoka",
          type: "site",
          name: "福岡サテライト",
          code: "SITE-FKO-002",
          scopes: ["japan"],
          tags: [],
          description: "タグ未設定データの表示検証用拠点。",
          partners: ["p_005"],
          centroid: [130.4017, 33.5902]
        }
      }
    ]
  },
  partners: [
    {
      id: "p_001",
      name: "Example Cloud株式会社",
      type: "クラウド基盤",
      url: "https://example.com",
      description: "首都圏案件のクラウドインフラ連携。",
      locationIds: ["loc_country_japan", "loc_pref_tokyo", "loc_muni_shibuya", "loc_site_tokyo_hq"],
      tags: ["tag_partner_strategic", "tag_phase_active"]
    },
    {
      id: "p_002",
      name: "Tokyo Mobility Systems",
      type: "モビリティ",
      url: "https://example.com/mobility",
      description: "交通データ活用の共同実証。",
      locationIds: ["loc_country_japan", "loc_pref_tokyo", "loc_site_tokyo_hq"],
      tags: ["tag_business_dx"]
    },
    {
      id: "p_003",
      name: "Kansai Green Partners",
      type: "エネルギー",
      url: "https://example.com/green",
      description: "関西圏グリーン案件の運用協力。",
      locationIds: ["loc_country_japan", "loc_pref_osaka", "loc_area_kansai", "loc_site_osaka_lab"],
      tags: ["tag_business_green", "tag_partner_strategic"]
    },
    {
      id: "p_004",
      name: "Shibuya Urban Link",
      type: "都市開発",
      url: "https://example.com/urban",
      description: "渋谷区のデータ連携プロジェクト。",
      locationIds: ["loc_muni_shibuya"],
      tags: ["tag_public"]
    },
    {
      id: "p_005",
      name: "West Japan Communications",
      type: "通信",
      url: "https://example.com/wjc",
      description: "福岡サテライトの通信回線支援。",
      locationIds: ["loc_site_fukuoka"],
      tags: ["tag_phase_active"]
    },
    {
      id: "p_010",
      name: "US Data Frontier",
      type: "海外連携",
      url: "https://example.com/us",
      description: "北米市場向け共同展開。",
      locationIds: ["loc_country_usa"],
      tags: ["tag_partner_strategic"]
    },
    {
      id: "p_011",
      name: "Singapore Smart Energy",
      type: "海外連携",
      url: "https://example.com/sg",
      description: "ASEAN向けグリーン施策の連携先。",
      locationIds: ["loc_country_singapore"],
      tags: ["tag_business_green", "tag_phase_active"]
    }
  ]
};
