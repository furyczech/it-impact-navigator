-- SQL to insert components
INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755174536455',
      'Matching',
      'application',
      'online',
      'medium',
      'Matching Platform IDB',
      'AWS',
      'IT + IDB desk',
      'NotNull Makers',
      '2025-08-14T13:44:01.979Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755174592437',
      'Bloomberg Anywhere',
      'service',
      'online',
      'critical',
      'Aplikace Bloomberg Anywhere - chat + trading data',
      'Cloud',
      'IDB',
      'Bloomberg',
      '2025-08-14T13:44:01.715Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755174685980',
      'LSEG Workspace',
      'service',
      'online',
      'critical',
      'Aplikace LSEG Workspace - chat + trading data',
      'Cloud',
      'IDB',
      'LSEG',
      '2025-08-14T13:44:01.357Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755174780001',
      'OpenScape Xpert (Turret)',
      'service',
      'online',
      'critical',
      'Turrety na komunikaci mezi brokery a tradery',
      'Kanceláře 42FS + homeoffice',
      'IDB + Energy',
      'iXperta',
      '2025-08-14T13:44:00.799Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755174878123',
      'CTS42 CRM',
      'application',
      'online',
      'critical',
      'CRM modul aplikace CTS42',
      'CTS42',
      'IT + Backoffice + Midoffice',
      'CTS TradeIT',
      '2025-08-14T12:40:52.323Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755174959704',
      'CTS42 Frontoffice IDB web',
      'application',
      'online',
      'critical',
      'IDB modul aplikace CTS42',
      'CTS42',
      'IDB',
      'CTS TradeIT',
      '2025-08-14T12:35:59.704Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755175241241',
      'CTS42 Backoffice web',
      'application',
      'online',
      'critical',
      'Backoffice modul aplikace CTS42',
      'CTS42',
      'Backoffice',
      'CTS TradeIT',
      '2025-08-14T12:40:41.241Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755175314836',
      'ANNA - ISIN',
      'service',
      'online',
      'critical',
      'Databáze ISIN kódů cenných papírů.',
      'Cloud',
      'Backoffice',
      'DSB - Derivatives Service Bureau',
      '2025-08-14T12:41:54.836Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755175364256',
      'Markitwire',
      'service',
      'online',
      'critical',
      'Platforma pro potvrzování obchodů.',
      'Cloud',
      'Backoffice',
      'IHS Markit',
      '2025-08-14T14:05:27.405Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755175408652',
      'CTS42 Reporting',
      'application',
      'online',
      'high',
      'Reporting modul aplikace CTS42',
      'CTS42',
      'IT + Reporting',
      'CTS TradeIT',
      '2025-08-14T14:21:35.068Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755175825189',
      'CTS42',
      'application',
      'offline',
      'critical',
      'Aplikace 42FS',
      'Virtuální server',
      'IT',
      'CTS TradeIT',
      '2025-08-14T15:09:02.406Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755180931837',
      'ANYGW',
      'server',
      'offline',
      'critical',
      'Produkční prostředí CTS',
      'Serverovna',
      'IT + Totalservice',
      'Totalservice',
      '2025-08-14T15:09:01.678Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755186334142',
      'ttwweqqqqqqqqqqqqqqqqqqqqqqqqqqestsdasdasdasdasdasdadasdas',
      'server',
      'online',
      'medium',
      '',
      '',
      '',
      '',
      '2025-08-14T15:54:16.893Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.components (
      id, name, type, status, criticality, description, 
      location, owner, vendor, last_updated, metadata
    ) VALUES (
      '1755186940596',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'server',
      'online',
      'low',
      '',
      '',
      '',
      '',
      '2025-08-14T15:55:40.596Z',
      '{}'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      criticality = EXCLUDED.criticality,
      description = EXCLUDED.description,
      location = EXCLUDED.location,
      owner = EXCLUDED.owner,
      vendor = EXCLUDED.vendor,
      last_updated = EXCLUDED.last_updated,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

